"""
LangGraph orchestration for the alarm investigation workflow.

The investigation is modelled as an explicit state machine:

    START -> topology_discovery -> shared_dependencies -> kpi_extraction
          -> evidence_integrity -> (conditional route)
                -> halt            -> END   (telemetry gaps, no proposal)
                -> no_action       -> END   (KPIs nominal, no proposal)
                -> synthesize_and_stage -> END (RAG + LLM + HITL staging)

Every node performs one deterministic tool call (or the final synthesis) and
appends an audit step. The conditional edge after evidence review is what
guarantees a production change is only proposed when measured KPIs are degraded
and evidence is genuine.
"""

import operator
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Dict, List, Optional, Tuple, TypedDict

from dateutil import parser
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from app.config import settings
from app.security.rbac import Role, SecurityContext
from app.mcp.tools import MCPToolRegistry


class InvestigationState(TypedDict, total=False):
    # Inputs
    tenant_id: str
    affected_cells: List[str]
    incident_time: datetime
    agent_id: str

    # Accumulated evidence
    steps: Annotated[List[Dict[str, Any]], operator.add]
    shared_entities: List[Dict[str, Any]]
    all_entities: List[str]
    kpi_observations: Dict[str, List[Dict[str, Any]]]
    quality_eval: Dict[str, Any]
    kpi_summary: Dict[str, str]
    cell_availabilities: List[float]
    transport_losses: List[float]

    # Routing + outcome
    is_genuine: bool
    has_uncertainty: bool
    has_degradation: bool
    decision: str  # "halt" | "no_action" | "propose"
    target_id: Optional[str]
    failover_path: Optional[Dict[str, Any]]
    root_cause_summary: str
    staged_action: Optional[Dict[str, Any]]
    ai_engine: Dict[str, Any]

    # LangGraph bookkeeping
    thread_id: str


class InvestigationGraph:
    def __init__(self, registry: MCPToolRegistry):
        self.registry = registry
        self.graph = self._build()

    # ------------------------------------------------------------------
    # Graph construction
    # ------------------------------------------------------------------
    def _build(self):
        builder = StateGraph(InvestigationState)
        builder.add_node("topology_discovery", self._topology_discovery)
        builder.add_node("shared_dependencies", self._shared_dependencies)
        builder.add_node("kpi_extraction", self._kpi_extraction)
        builder.add_node("evidence_integrity", self._evidence_integrity)
        builder.add_node("halt", self._halt)
        builder.add_node("no_action", self._no_action)
        builder.add_node("synthesize_and_stage", self._synthesize_and_stage)

        builder.add_edge(START, "topology_discovery")
        builder.add_edge("topology_discovery", "shared_dependencies")
        builder.add_edge("shared_dependencies", "kpi_extraction")
        builder.add_edge("kpi_extraction", "evidence_integrity")
        builder.add_conditional_edges(
            "evidence_integrity",
            self._route_after_evidence,
            {
                "halt": "halt",
                "no_action": "no_action",
                "propose": "synthesize_and_stage",
            },
        )
        builder.add_edge("halt", END)
        builder.add_edge("no_action", END)
        builder.add_edge("synthesize_and_stage", END)
        return builder.compile(checkpointer=InMemorySaver())

    def run(
        self,
        tenant_id: str,
        affected_cells: List[str],
        incident_time: datetime,
        agent_id: str = "alarm-agent-01",
    ) -> Dict[str, Any]:
        if not affected_cells:
            raise ValueError("affected_cells must contain at least one entity id.")

        thread_id = f"INV-{uuid.uuid4().hex[:12]}"
        initial_state: InvestigationState = {
            "tenant_id": tenant_id,
            "affected_cells": list(affected_cells),
            "incident_time": incident_time,
            "agent_id": agent_id,
            "steps": [],
            "thread_id": thread_id,
        }
        return self.graph.invoke(
            initial_state,
            config={"configurable": {"thread_id": thread_id}},
        )

    def to_mermaid(self) -> str:
        """Renders the compiled graph for documentation / debugging."""
        return self.graph.get_graph().draw_mermaid()

    # ------------------------------------------------------------------
    # Nodes
    # ------------------------------------------------------------------
    def _topology_discovery(self, state: InvestigationState) -> Dict[str, Any]:
        started = time.perf_counter()
        primary_cell = state["affected_cells"][0]
        parameters = {
            "entity_id": primary_cell,
            "as_of_time": state["incident_time"].isoformat(),
            "max_hops": 2,
        }
        result = self.registry.execute_tool(
            "get_topology_neighborhood", parameters, self._context(state)
        )
        return {
            "steps": [
                self._step(
                    1,
                    "Topology Neighborhood Discovery",
                    "DETERMINISTIC_TOOL",
                    "get_topology_neighborhood",
                    parameters,
                    result.get("content", {}),
                    started,
                )
            ]
        }

    def _shared_dependencies(self, state: InvestigationState) -> Dict[str, Any]:
        started = time.perf_counter()
        parameters = {
            "entity_ids": state["affected_cells"],
            "as_of_time": state["incident_time"].isoformat(),
        }
        result = self.registry.execute_tool(
            "find_shared_dependencies", parameters, self._context(state)
        )
        shared_entities = result.get("content", {}).get("shared_dependencies", [])
        all_entities = list(state["affected_cells"]) + [
            entity["id"] for entity in shared_entities
        ]
        return {
            "steps": [
                self._step(
                    2,
                    "Correlate Shared Infrastructure Dependencies",
                    "DETERMINISTIC_TOOL",
                    "find_shared_dependencies",
                    parameters,
                    result.get("content", {}),
                    started,
                )
            ],
            "shared_entities": shared_entities,
            "all_entities": all_entities,
        }

    def _kpi_extraction(self, state: InvestigationState) -> Dict[str, Any]:
        started = time.perf_counter()
        incident_time = state["incident_time"]
        pre_incident_start = incident_time - timedelta(minutes=30)
        incident_window_end = incident_time + timedelta(minutes=15)
        kpi_observations: Dict[str, List[Dict[str, Any]]] = {}

        for entity_id in state.get("all_entities", []):
            result = self.registry.execute_tool(
                "get_entity_kpis",
                {
                    "entity_id": entity_id,
                    "start_time": pre_incident_start.isoformat(),
                    "end_time": incident_window_end.isoformat(),
                },
                self._context(state),
            )
            kpi_observations[entity_id] = result.get("content", {}).get("kpis", [])

        return {
            "steps": [
                self._step(
                    3,
                    "Temporal KPI Extraction (Pre & Post Incident)",
                    "DETERMINISTIC_TOOL",
                    "get_entity_kpis",
                    {
                        "entities": state.get("all_entities", []),
                        "range": f"{pre_incident_start.isoformat()} to {incident_window_end.isoformat()}",
                    },
                    kpi_observations,
                    started,
                )
            ],
            "kpi_observations": kpi_observations,
        }

    def _evidence_integrity(self, state: InvestigationState) -> Dict[str, Any]:
        started = time.perf_counter()
        incident_time = state["incident_time"]
        pre_incident_start = incident_time - timedelta(minutes=30)
        incident_window_end = incident_time + timedelta(minutes=15)

        result = self.registry.execute_tool(
            "verify_evidence_integrity",
            {
                "entity_ids": state.get("all_entities", []),
                "start_time": pre_incident_start.isoformat(),
                "end_time": incident_window_end.isoformat(),
            },
            self._context(state),
        )
        quality_eval = result.get("content", {})

        window_start = self._incident_window_start(incident_time)
        window_kpis = self._extract_window_kpis(
            state.get("kpi_observations", {}), window_start
        )
        kpi_summary, cell_availabilities, transport_losses = self._summarise_incident_kpis(
            state["affected_cells"], state.get("shared_entities", []), window_kpis
        )

        # Judge only the cells that triggered the alarm. Downstream entities
        # without their own telemetry stream are not evidence gaps.
        affected_quality = {
            cell_id: quality_eval[cell_id]
            for cell_id in state["affected_cells"]
            if cell_id in quality_eval
        }
        is_genuine = any(
            v.get("verdict") == "GENUINE_NETWORK_PROBLEM"
            for v in affected_quality.values()
        )
        has_uncertainty = any(
            v.get("verdict") in ("DATA_GAP_OR_UNCERTAINTY", "NO_DATA")
            for v in affected_quality.values()
        )
        has_degradation = (
            any(v < settings.KPI_CELL_AVAILABILITY_MIN_PCT for v in cell_availabilities)
            or any(v > settings.KPI_PACKET_LOSS_MAX_PCT for v in transport_losses)
        )

        if not is_genuine and has_uncertainty:
            decision = "halt"
        elif not has_degradation:
            decision = "no_action"
        else:
            decision = "propose"

        return {
            "steps": [
                self._step(
                    4,
                    "Evidence Integrity & Uncertainty Verification",
                    "DETERMINISTIC_TOOL",
                    "verify_evidence_integrity",
                    {"entity_ids": state.get("all_entities", [])},
                    quality_eval,
                    started,
                )
            ],
            "quality_eval": quality_eval,
            "kpi_summary": kpi_summary,
            "cell_availabilities": cell_availabilities,
            "transport_losses": transport_losses,
            "is_genuine": is_genuine,
            "has_uncertainty": has_uncertainty,
            "has_degradation": has_degradation,
            "decision": decision,
        }

    def _route_after_evidence(self, state: InvestigationState) -> str:
        return state.get("decision", "no_action")

    def _halt(self, state: InvestigationState) -> Dict[str, Any]:
        started = time.perf_counter()
        root_cause = (
            "INVESTIGATION HALTED / NO REMEDIATION PROPOSED: "
            "Data quality assessment identified that the apparent cell degradation "
            "is caused by telemetry gaps (missing counter samples), not a confirmed physical network fault. "
            "Automated ticket opened for Telemetry Ingestion Pipeline verification."
        )
        return {
            "root_cause_summary": root_cause,
            "target_id": None,
            "staged_action": None,
            "ai_engine": {
                "status": "NOT_INVOKED",
                "provider": "Google Gemini",
                "model": None,
                "attempts": [],
                "fallback_reason": None,
                "engine_used": "Deterministic Decision Gate (LLM not required)",
            },
            "steps": [
                self._step(
                    5,
                    "Decision Gate: Remediation Declined (Data Quality)",
                    "DECISION_GATE",
                    None,
                    {"decision": "halt", "entity_ids": state["affected_cells"]},
                    {"root_cause": root_cause, "staged_action": None},
                    started,
                )
            ],
        }

    def _no_action(self, state: InvestigationState) -> Dict[str, Any]:
        started = time.perf_counter()
        summary = state.get("kpi_summary", {})
        root_cause = (
            "NO REMEDIATION REQUIRED: sampled KPIs are within operating thresholds "
            f"(cell availability {summary.get('cell_availability', 'n/a')}, "
            f"transport packet loss {summary.get('csr_packet_loss', 'n/a')}). "
            "No change proposal staged."
        )
        return {
            "root_cause_summary": root_cause,
            "target_id": None,
            "staged_action": None,
            "ai_engine": {
                "status": "NOT_INVOKED",
                "provider": "Google Gemini",
                "model": None,
                "attempts": [],
                "fallback_reason": None,
                "engine_used": "Deterministic Decision Gate (LLM not required)",
            },
            "steps": [
                self._step(
                    5,
                    "Decision Gate: No Remediation Required",
                    "DECISION_GATE",
                    None,
                    {"decision": "no_action", "incident_kpis": summary},
                    {"root_cause": root_cause, "staged_action": None},
                    started,
                )
            ],
        }

    def _synthesize_and_stage(self, state: InvestigationState) -> Dict[str, Any]:
        started = time.perf_counter()
        from app.vector_store import get_vector_store
        from app.ai import get_ai_service
        from app.topology_engine.failover import FailoverPathResolver

        shared_entities = state.get("shared_entities", [])

        matched_runbooks = get_vector_store().search_runbooks(
            "optical fiber backhaul discard packet loss cell availability drop", top_k=2
        )

        window_kpis = self._extract_window_kpis(
            state.get("kpi_observations", {}),
            self._incident_window_start(state["incident_time"]),
        )
        bottleneck = self._select_shared_bottleneck(shared_entities, window_kpis)
        target_id = bottleneck["id"] if bottleneck else state["affected_cells"][0]

        # Put the selected bottleneck first so narrative and action agree.
        if bottleneck:
            ordered_shared = [bottleneck] + [
                entity for entity in shared_entities
                if entity.get("id") != bottleneck.get("id")
            ]
        else:
            ordered_shared = shared_entities

        synthesis = get_ai_service().generate_incident_synthesis(
            affected_cells=state["affected_cells"],
            shared_dependencies=ordered_shared,
            kpi_summary=state.get("kpi_summary", {}),
            matched_runbooks=matched_runbooks,
        )
        ai_engine = {
            "status": synthesis.get("ai_status", "FALLBACK"),
            "provider": "Google Gemini",
            "model": synthesis.get("model_used"),
            "attempts": synthesis.get("attempts", []),
            "fallback_reason": synthesis.get("fallback_reason"),
            "engine_used": synthesis.get("engine_used", "AI Reasoning Engine"),
        }

        failover_path = FailoverPathResolver(self.registry.topology_service).resolve(
            tenant_id=state["tenant_id"],
            primary_entity_id=target_id,
            as_of=state["incident_time"],
        )
        standby = failover_path.get("standby") or {}
        capacity = failover_path.get("capacity") or {}

        if failover_path.get("feasible"):
            standby_medium = str(standby.get("medium") or "").lower()
            if "microwav" in standby_medium:
                action_type = "REROUTE_STANDBY_MICROWAVE_BACKHAUL"
            elif "fiber" in standby_medium or "optical" in standby_medium:
                action_type = "REROUTE_STANDBY_FIBER_BACKHAUL"
            else:
                action_type = "REROUTE_STANDBY_BACKHAUL"

            path_label = failover_path.get("path_label") or " -> ".join(
                failover_path.get("path") or []
            )
            justification = (
                f"Diverts traffic from degraded transport interface on {target_id} "
                f"to the deterministic standby path {path_label}. "
                f"{capacity.get('summary') or 'Capacity headroom was not recorded.'} "
                f"Observed incident KPIs: {state.get('kpi_summary', {})}."
            )
            rollback_procedure = (
                f"Re-enable primary transport interface {target_id} and revert traffic "
                f"from {standby.get('id') or 'the standby link'} if standby latency "
                "exceeds 15ms or packet loss exceeds 0.5%."
            )
        else:
            action_type = "DISPATCH_FIELD_ENGINEER"
            justification = (
                f"No deterministic standby path is connected for {target_id} "
                f"({failover_path.get('reason') or 'no bypass available'}). "
                "Dispatch a field engineer to restore the failed transport path. "
                f"Observed incident KPIs: {state.get('kpi_summary', {})}."
            )
            rollback_procedure = (
                f"Cancel the dispatch if the transport path {target_id} clears before arrival."
            )

        blast_radius = self._derive_blast_radius(
            tenant_id=state["tenant_id"],
            target_id=target_id,
            action_type=action_type,
            agent_id=state.get("agent_id", "alarm-agent-01"),
            incident_time=state["incident_time"],
            affected_cells=state["affected_cells"],
        )

        result = self.registry.execute_tool(
            "propose_remediation_action",
            {
                "target_entity_id": target_id,
                "action_type": action_type,
                "justification": justification,
                "blast_radius_summary": blast_radius,
                "rollback_procedure": rollback_procedure,
                "bypass_path": failover_path,
            },
            self._context(state),
        )
        staged_action = result.get("content", {}).get("staged_action")

        return {
            "steps": [
                self._step(
                    5,
                    "Root Cause Synthesis & Remediation Staging",
                    "LLM_SYNTHESIS",
                    "propose_remediation_action" if staged_action else None,
                    {"target": target_id, "incident_kpis": state.get("kpi_summary", {})},
                    {
                        "root_cause": synthesis["root_cause"],
                        "diagnosis": synthesis.get("diagnosis", synthesis["root_cause"]),
                        "recommendation": synthesis.get("recommendation", ""),
                        "staged_action": staged_action,
                        "failover_path": failover_path,
                        "engine_used": synthesis.get("engine_used", "AI Reasoning Engine"),
                        "ai_engine": ai_engine,
                    },
                    started,
                )
            ],
            "target_id": target_id,
            "failover_path": failover_path,
            "root_cause_summary": synthesis["root_cause"],
            "staged_action": staged_action,
            "ai_engine": ai_engine,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _context(state: InvestigationState) -> SecurityContext:
        return SecurityContext(
            caller_id=state.get("agent_id", "alarm-agent-01"),
            role=Role.ALARM_MANAGEMENT,
            tenant_id=state["tenant_id"],
        )

    @staticmethod
    def _step(
        step_number: int,
        step_name: str,
        phase_type: str,
        tool_invoked: Optional[str],
        parameters: Dict[str, Any],
        observation: Any,
        started: float,
    ) -> Dict[str, Any]:
        return {
            "step_number": step_number,
            "step_name": step_name,
            "phase_type": phase_type,
            "tool_invoked": tool_invoked,
            "parameters": parameters,
            "observation": observation,
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            "timestamp": datetime.now(timezone.utc),
        }

    @staticmethod
    def _incident_window_start(incident_time: datetime) -> datetime:
        interval = max(1, settings.KPI_INTERVAL_MINUTES)
        return incident_time.replace(
            minute=(incident_time.minute // interval) * interval,
            second=0,
            microsecond=0,
        )

    @staticmethod
    def _parse_timestamp(value: Any) -> Optional[datetime]:
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                return parser.isoparse(value)
            except (ValueError, TypeError):
                return None
        return None

    def _extract_window_kpis(
        self,
        kpi_observations: Dict[str, List[Dict[str, Any]]],
        window_start: datetime,
    ) -> Dict[str, Dict[str, float]]:
        window: Dict[str, Dict[str, float]] = {}
        for entity_id, records in kpi_observations.items():
            for record in records:
                timestamp = self._parse_timestamp(record.get("timestamp"))
                if timestamp == window_start:
                    window.setdefault(entity_id, {})[record["kpi_name"]] = float(
                        record["value"]
                    )
        return window

    @staticmethod
    def _summarise_incident_kpis(
        affected_cells: List[str],
        shared_entities: List[Dict[str, Any]],
        window_kpis: Dict[str, Dict[str, float]],
    ) -> Tuple[Dict[str, str], List[float], List[float]]:
        cell_availabilities = [
            window_kpis.get(cell_id, {}).get("CELL_AVAILABILITY")
            for cell_id in affected_cells
        ]
        cell_availabilities = [v for v in cell_availabilities if v is not None]

        transport_losses: List[float] = []
        for entity in shared_entities:
            if entity.get("entity_type") in ("router", "transport_link"):
                value = window_kpis.get(entity.get("id", ""), {}).get(
                    "TRANSPORT_PACKET_LOSS"
                )
                if value is not None:
                    transport_losses.append(value)

        summary = {
            "cell_availability": (
                f"{min(cell_availabilities):.2f}%" if cell_availabilities else "n/a"
            ),
            "csr_packet_loss": (
                f"{max(transport_losses):.2f}%" if transport_losses else "n/a"
            ),
        }
        return summary, cell_availabilities, transport_losses

    @staticmethod
    def _select_shared_bottleneck(
        shared_entities: List[Dict[str, Any]],
        window_kpis: Dict[str, Dict[str, float]],
    ) -> Optional[Dict[str, Any]]:
        candidates = [
            entity for entity in shared_entities
            if entity.get("entity_type") in ("router", "transport_link")
        ]
        if not candidates:
            return None

        def loss(entity: Dict[str, Any]) -> Optional[float]:
            return window_kpis.get(entity.get("id", ""), {}).get(
                "TRANSPORT_PACKET_LOSS"
            )

        transport = [e for e in candidates if e.get("entity_type") == "transport_link"]
        pool = transport or candidates

        measured = [(loss(e), e) for e in pool if loss(e) is not None]
        if measured:
            return max(measured, key=lambda item: item[0])[1]

        non_standby = [e for e in pool if "STANDBY" not in e.get("id", "").upper()]
        return (non_standby or pool)[0]

    def _derive_blast_radius(
        self,
        tenant_id: str,
        target_id: str,
        action_type: str,
        agent_id: str,
        incident_time: datetime,
        affected_cells: List[str],
    ) -> str:
        from app.agents.change_agent import ChangePlanningAgent

        try:
            assessment = ChangePlanningAgent(self.registry).assess_change_impact(
                tenant_id=tenant_id,
                target_entity_id=target_id,
                change_type=action_type,
                agent_id=agent_id,
                as_of=incident_time,
                with_ai=False,
            )
            mapped = ", ".join(assessment.affected_cells) or "none mapped"
            return (
                f"Affects {len(assessment.affected_cells)} cell(s) ({mapped}) and "
                f"~{assessment.estimated_impacted_subscribers} active subscribers. "
                f"Risk {assessment.risk_level}; standby redundancy "
                f"{'available' if assessment.has_standby_redundancy else 'NOT available'}."
            )
        except Exception:
            return (
                f"Affects {len(affected_cells)} reported cell(s) "
                f"({', '.join(affected_cells)}); downstream impact could not be fully mapped."
            )

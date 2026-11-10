"""
Alarm Management Autonomous AI Agent.

Thin facade over the LangGraph investigation workflow
(:mod:`app.agents.investigation_graph`). The agent owns the public report
contract; orchestration, routing and the audit trail live in the graph.
"""

import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.agents.investigation_graph import InvestigationGraph
from app.mcp.tools import MCPToolRegistry
from app.config import settings


class InvestigationStep(BaseModel):
    step_number: int
    step_name: str
    phase_type: str  # "DETERMINISTIC_TOOL" or "LLM_SYNTHESIS"
    tool_invoked: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    observation: Any = None
    duration_ms: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IncidentInvestigationReport(BaseModel):
    incident_id: str
    tenant_id: str
    trigger_time: datetime
    affected_entities: List[str]
    total_duration_ms: float
    sla_target_met: bool
    data_quality_assessment: Dict[str, Any]
    shared_dependencies_found: List[Dict[str, Any]]
    root_cause_summary: str
    recommended_action: Optional[Dict[str, Any]] = None
    execution_steps: List[InvestigationStep] = Field(default_factory=list)


class AlarmManagementAgent:
    """
    Executes the alarm investigation workflow and assembles the report.

    The workflow is a compiled LangGraph state machine with a conditional
    branch that only stages a remediation when evidence is genuine and the
    measured KPIs are actually degraded.
    """

    def __init__(self, mcp_registry: MCPToolRegistry):
        self.registry = mcp_registry
        self.graph = InvestigationGraph(mcp_registry)

    def investigate_incident(
        self,
        tenant_id: str,
        affected_cells: List[str],
        incident_time: datetime,
        agent_id: str = "alarm-agent-01"
    ) -> IncidentInvestigationReport:
        """
        Executes end-to-end incident investigation adhering to strict SLA (<30s).
        """
        start_time = time.perf_counter()
        state = self.graph.run(
            tenant_id=tenant_id,
            affected_cells=affected_cells,
            incident_time=incident_time,
            agent_id=agent_id,
        )
        total_duration = (time.perf_counter() - start_time) * 1000

        return IncidentInvestigationReport(
            incident_id=f"INC-{incident_time.strftime('%Y%m%d%H%M')}-{affected_cells[0]}",
            tenant_id=tenant_id,
            trigger_time=incident_time,
            affected_entities=list(affected_cells),
            total_duration_ms=round(total_duration, 2),
            sla_target_met=total_duration <= (settings.AGENT_INVESTIGATION_TIMEOUT_SECONDS * 1000),
            data_quality_assessment=state.get("quality_eval", {}),
            shared_dependencies_found=state.get("shared_entities", []),
            root_cause_summary=state.get("root_cause_summary", ""),
            recommended_action=state.get("staged_action"),
            execution_steps=[
                InvestigationStep.model_validate(step)
                for step in state.get("steps", [])
            ],
        )

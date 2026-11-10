"""
Change Planning Autonomous AI Agent.
Simulates network changes, calculates blast radius (subscribers, cells, services),
and prepares formal change advisory recommendations for Human-In-The-Loop approval.
"""

from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

from app.security.rbac import SecurityContext, Role, Permission
from app.mcp.tools import MCPToolRegistry
from app.config import settings
from app.ai import get_ai_service

class ChangeImpactAssessment(BaseModel):
    target_entity_id: str
    change_type: str
    tenant_id: str
    affected_cells: List[str]
    estimated_impacted_subscribers: int
    has_standby_redundancy: bool
    risk_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    recommendation: str
    requires_human_approval: bool = True
    risk_analysis: Optional[str] = None
    suggested_window: Optional[str] = None
    rollback_strategy: Optional[str] = None
    pre_flight_checks: List[str] = Field(default_factory=list)
    ai_engine_used: Optional[str] = None

class ChangePlanningAgent:
    def __init__(self, mcp_registry: MCPToolRegistry):
        self.registry = mcp_registry

    def assess_change_impact(
        self,
        tenant_id: str,
        target_entity_id: str,
        change_type: str,
        agent_id: str = "change-planner-01",
        as_of: Optional[datetime] = None
    ) -> ChangeImpactAssessment:
        context = SecurityContext(
            caller_id=agent_id,
            role=Role.CHANGE_PLANNING,
            tenant_id=tenant_id
        )
        context.require_permission(Permission.SIMULATE_CHANGE)

        now = as_of or datetime.now(timezone.utc)
        
        # Traverse downstream topology to evaluate impact. Three hops are needed
        # to map cells when the target is a transport link (link -> CSR -> node -> cell).
        topo_res = self.registry.execute_tool(
            "get_topology_neighborhood",
            {
                "entity_id": target_entity_id,
                "as_of_time": now.isoformat(),
                "max_hops": settings.TOPOLOGY_MAX_HOPS_ABSOLUTE_LIMIT
            },
            context
        )
        nodes = topo_res.get("content", {}).get("nodes", [])
        cells = [n["id"] for n in nodes if n.get("entity_type") == "cell"]
        
        # Calculate impact metrics
        subscriber_estimate = len(cells) * 140
        has_redundancy = any("STANDBY" in n.get("id", "").upper() or "MICROWAVE" in n.get("id", "").upper() for n in nodes)
        
        risk = "LOW" if has_redundancy else "HIGH"
        if len(cells) > 5:
            risk = "CRITICAL"

        # Synthesize deep risk analysis, rollback strategy, and execution window via AI
        ai_assessment = get_ai_service().generate_change_risk_assessment(
            target_entity_id=target_entity_id,
            change_type=change_type,
            affected_cells=cells,
            estimated_subscribers=subscriber_estimate,
            has_redundancy=has_redundancy,
            topology_nodes=nodes,
            calculated_risk=risk
        )

        recommendation = ai_assessment.get("recommendation") or (
            f"Change Impact Analysis for {change_type} on {target_entity_id}: "
            f"Downstream impact reaches {len(cells)} cells (~{subscriber_estimate} subscribers). "
            f"Redundancy path is {'available (risk: LOW)' if has_redundancy else 'NOT available (risk: HIGH)'}. "
            f"Requires Tier-2 NOC Human Lead approval before execution window."
        )

        return ChangeImpactAssessment(
            target_entity_id=target_entity_id,
            change_type=change_type,
            tenant_id=tenant_id,
            affected_cells=cells,
            estimated_impacted_subscribers=subscriber_estimate,
            has_standby_redundancy=has_redundancy,
            risk_level=ai_assessment.get("risk_level", risk),
            recommendation=recommendation,
            risk_analysis=ai_assessment.get("risk_analysis"),
            suggested_window=ai_assessment.get("suggested_window"),
            rollback_strategy=ai_assessment.get("rollback_strategy"),
            pre_flight_checks=ai_assessment.get("pre_flight_checks", []),
            ai_engine_used=ai_assessment.get("engine_used")
        )


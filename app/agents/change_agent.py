"""
Change Planning Autonomous AI Agent.
Simulates network changes, calculates blast radius (subscribers, cells, services),
and prepares formal change advisory recommendations for Human-In-The-Loop approval.
"""

from datetime import datetime, timezone
from typing import Dict, List, Any
from pydantic import BaseModel, Field

from app.security.rbac import SecurityContext, Role, Permission
from app.mcp.tools import MCPToolRegistry

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

class ChangePlanningAgent:
    def __init__(self, mcp_registry: MCPToolRegistry):
        self.registry = mcp_registry

    def assess_change_impact(
        self,
        tenant_id: str,
        target_entity_id: str,
        change_type: str,
        agent_id: str = "change-planner-01"
    ) -> ChangeImpactAssessment:
        context = SecurityContext(
            caller_id=agent_id,
            role=Role.CHANGE_PLANNING,
            tenant_id=tenant_id
        )
        context.require_permission(Permission.SIMULATE_CHANGE)

        now = datetime.now(timezone.utc)
        
        # Traverse downstream topology to evaluate impact
        topo_res = self.registry.execute_tool(
            "get_topology_neighborhood",
            {
                "entity_id": target_entity_id,
                "as_of_time": now.isoformat(),
                "max_hops": 2
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

        recommendation = (
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
            risk_level=risk,
            recommendation=recommendation
        )

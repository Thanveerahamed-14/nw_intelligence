"""
Agent Orchestration Hub.
Provides single-point coordination for Role-Based Autonomous Agents,
session lifecycle management, and Gemini/Vertex AI model interfacing.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.agents.alarm_agent import AlarmManagementAgent, IncidentInvestigationReport
from app.agents.change_agent import ChangePlanningAgent, ChangeImpactAssessment
from app.agents.human_in_the_loop import get_hitl_manager, HITLManager
from app.mcp.tools import MCPToolRegistry

class AgentOrchestrationHub:
    def __init__(self, mcp_registry: MCPToolRegistry):
        self.mcp_registry = mcp_registry
        self.alarm_agent = AlarmManagementAgent(mcp_registry)
        self.change_agent = ChangePlanningAgent(mcp_registry)
        self.hitl_manager = get_hitl_manager()
        self.active_investigations: Dict[str, IncidentInvestigationReport] = {}

    def run_alarm_investigation(
        self,
        tenant_id: str,
        affected_cells: List[str],
        incident_time: Optional[datetime] = None
    ) -> IncidentInvestigationReport:
        t = incident_time or datetime.now(timezone.utc)
        report = self.alarm_agent.investigate_incident(tenant_id, affected_cells, t)
        self.active_investigations[report.incident_id] = report
        return report

    def run_change_simulation(
        self,
        tenant_id: str,
        target_entity_id: str,
        change_type: str
    ) -> ChangeImpactAssessment:
        return self.change_agent.assess_change_impact(tenant_id, target_entity_id, change_type)

    def get_investigation_report(self, incident_id: str) -> Optional[IncidentInvestigationReport]:
        return self.active_investigations.get(incident_id)

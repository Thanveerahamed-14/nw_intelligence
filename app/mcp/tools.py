"""
Model Context Protocol (MCP) Tool Definitions and Handlers.
Exposes bounded, role-governed tools for autonomous telecom agents.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dateutil import parser
from pydantic import BaseModel, Field

from app.security.rbac import SecurityContext, Permission, Role
from app.security.tenancy import TenantContext
from app.topology_engine.traversal import TopologyTraversalService
from app.kpi_engine.quality import KPIService
from app.config import settings

class MCPToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
    required_permission: Permission

class MCPToolRegistry:
    def __init__(self, topology_service: TopologyTraversalService, kpi_service: KPIService):
        self.topology_service = topology_service
        self.kpi_service = kpi_service
        self.tools: Dict[str, MCPToolDefinition] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        self.tools["get_topology_neighborhood"] = MCPToolDefinition(
            name="get_topology_neighborhood",
            description="Fetch bounded k-hop network topology around an entity as of a specific point in time.",
            parameters={
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string", "description": "Canonical ID of the seed entity (e.g. CELL_001)"},
                    "as_of_time": {"type": "string", "description": "ISO 8601 UTC timestamp to query temporal topology as of (e.g. 2026-11-10T10:05:00Z)"},
                    "max_hops": {"type": "integer", "description": "Maximum traversal depth (default 2, hard limit 3)", "default": 2}
                },
                "required": ["entity_id", "as_of_time"]
            },
            required_permission=Permission.TOPOLOGY_READ
        )

        self.tools["find_shared_dependencies"] = MCPToolDefinition(
            name="find_shared_dependencies",
            description="Identifies common upstream infrastructure (shared CSR, backhaul link, site) connecting multiple affected entities.",
            parameters={
                "type": "object",
                "properties": {
                    "entity_ids": {"type": "array", "items": {"type": "string"}, "description": "List of affected entity IDs"},
                    "as_of_time": {"type": "string", "description": "ISO 8601 UTC timestamp"}
                },
                "required": ["entity_ids", "as_of_time"]
            },
            required_permission=Permission.TOPOLOGY_READ
        )

        self.tools["get_entity_kpis"] = MCPToolDefinition(
            name="get_entity_kpis",
            description="Retrieves time-series KPIs with completeness scores, uncertainty flags, and sample counts.",
            parameters={
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string", "description": "Canonical entity ID"},
                    "start_time": {"type": "string", "description": "Start ISO 8601 timestamp"},
                    "end_time": {"type": "string", "description": "End ISO 8601 timestamp"}
                },
                "required": ["entity_id", "start_time", "end_time"]
            },
            required_permission=Permission.KPI_READ
        )

        self.tools["verify_evidence_integrity"] = MCPToolDefinition(
            name="verify_evidence_integrity",
            description="Crucial quality check: Verifies if apparent degradation is a genuine network fault vs missing reporting telemetry.",
            parameters={
                "type": "object",
                "properties": {
                    "entity_ids": {"type": "array", "items": {"type": "string"}, "description": "List of entity IDs to evaluate"},
                    "start_time": {"type": "string", "description": "Start ISO timestamp"},
                    "end_time": {"type": "string", "description": "End ISO timestamp"}
                },
                "required": ["entity_ids", "start_time", "end_time"]
            },
            required_permission=Permission.KPI_READ
        )

        self.tools["propose_remediation_action"] = MCPToolDefinition(
            name="propose_remediation_action",
            description="Stages a network remediation proposal for Human-In-The-Loop approval. Strictly does NOT execute directly on production.",
            parameters={
                "type": "object",
                "properties": {
                    "target_entity_id": {"type": "string", "description": "Target entity to remediate"},
                    "action_type": {"type": "string", "description": "E.g. REROUTE_STANDBY_BACKHAUL, REBOOT_OPTICAL_MODULE, TICKET_ESCALATION"},
                    "justification": {"type": "string", "description": "Detailed evidence and reasoning supporting the recommendation"},
                    "blast_radius_summary": {"type": "string", "description": "Estimated impact on surrounding entities and subscribers"},
                    "rollback_procedure": {"type": "string", "description": "Deterministic procedure to undo change if regression occurs"}
                },
                "required": ["target_entity_id", "action_type", "justification", "blast_radius_summary", "rollback_procedure"]
            },
            required_permission=Permission.PROPOSE_ACTION
        )

    def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        context: SecurityContext
    ) -> Dict[str, Any]:
        """Validates permissions, tenant boundary, bounds query, and executes tool."""
        if tool_name not in self.tools:
            return {"error": f"Unknown tool '{tool_name}'", "isError": True}

        tool_def = self.tools[tool_name]
        # Enforce RBAC
        context.require_permission(tool_def.required_permission)

        tenant_id = context.tenant_id

        if tool_name == "get_topology_neighborhood":
            entity_id = arguments["entity_id"]
            as_of = parser.isoparse(arguments["as_of_time"])
            max_hops = min(int(arguments.get("max_hops", 2)), settings.TOPOLOGY_MAX_HOPS_ABSOLUTE_LIMIT)
            res = self.topology_service.get_neighborhood(entity_id, as_of, tenant_id, max_hops)
            return {"content": res.to_dict(), "isError": False}

        elif tool_name == "find_shared_dependencies":
            entity_ids = arguments["entity_ids"]
            as_of = parser.isoparse(arguments["as_of_time"])
            res = self.topology_service.find_shared_dependencies(entity_ids, as_of, tenant_id)
            return {"content": res, "isError": False}

        elif tool_name == "get_entity_kpis":
            entity_id = arguments["entity_id"]
            start_time = parser.isoparse(arguments["start_time"])
            end_time = parser.isoparse(arguments["end_time"])
            records = self.kpi_service.get_entity_kpis(tenant_id, entity_id, start_time, end_time)
            return {
                "content": {
                    "entity_id": entity_id,
                    "kpis": [r.dict() for r in records],
                    "record_count": len(records)
                },
                "isError": False
            }

        elif tool_name == "verify_evidence_integrity":
            entity_ids = arguments["entity_ids"]
            start_time = parser.isoparse(arguments["start_time"])
            end_time = parser.isoparse(arguments["end_time"])
            assessments = self.kpi_service.verify_evidence_integrity(tenant_id, entity_ids, start_time, end_time)
            return {
                "content": {eid: a.to_dict() for eid, a in assessments.items()},
                "isError": False
            }

        elif tool_name == "propose_remediation_action":
            from app.agents.human_in_the_loop import get_hitl_manager
            hitl = get_hitl_manager()
            action = hitl.stage_proposal(
                tenant_id=tenant_id,
                proposed_by=context.caller_id,
                target_entity_id=arguments["target_entity_id"],
                action_type=arguments["action_type"],
                justification=arguments["justification"],
                blast_radius=arguments["blast_radius_summary"],
                rollback=arguments["rollback_procedure"]
            )
            return {
                "content": {
                    "message": "Action staged successfully in PENDING_APPROVAL state. Human authorization required before execution.",
                    "staged_action": action.dict()
                },
                "isError": False
            }

        return {"error": f"Tool '{tool_name}' not implemented", "isError": True}


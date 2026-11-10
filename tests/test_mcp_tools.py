"""
Unit Tests for Model Context Protocol (MCP) Server and Tools.
"""

import unittest
from datetime import datetime, timezone
from app.topology_engine.graph import TemporalTopologyGraph
from app.topology_engine.traversal import TopologyTraversalService
from app.kpi_engine.quality import KPIService
from app.mcp.tools import MCPToolRegistry
from app.mcp.server import MCPServer
from app.security.rbac import SecurityContext, Role
from data.seed_data import populate_sample_environment

class TestMCPProtocol(unittest.TestCase):
    def setUp(self):
        self.graph = TemporalTopologyGraph()
        self.kpi_service = KPIService()
        populate_sample_environment(self.graph, self.kpi_service)
        
        self.traversal = TopologyTraversalService(self.graph)
        self.registry = MCPToolRegistry(self.traversal, self.kpi_service)
        self.server = MCPServer(self.registry)
        
        self.alarm_ctx = SecurityContext(
            caller_id="alarm-agent-01",
            role=Role.ALARM_MANAGEMENT,
            tenant_id="customer_a"
        )

    def test_tools_list_schema(self):
        res = self.server.handle_tools_list(self.alarm_ctx)
        tool_names = [t["name"] for t in res["tools"]]
        self.assertIn("get_topology_neighborhood", tool_names)
        self.assertIn("find_shared_dependencies", tool_names)
        self.assertIn("get_entity_kpis", tool_names)
        self.assertIn("verify_evidence_integrity", tool_names)
        self.assertIn("propose_remediation_action", tool_names)

    def test_tools_call_get_neighborhood(self):
        rpc_res = self.server.handle_tools_call(
            tool_name="get_topology_neighborhood",
            arguments={
                "entity_id": "CELL_001",
                "as_of_time": "2026-11-10T10:05:00Z",
                "max_hops": 2
            },
            context=self.alarm_ctx
        )
        self.assertFalse(rpc_res["isError"])
        result_data = rpc_res["result"]
        self.assertEqual(result_data["seed_entity_id"], "CELL_001")
        self.assertTrue(result_data["sla_met"])
        self.assertGreater(result_data["node_count"], 0)

    def test_tools_call_rbac_enforcement(self):
        # Performance analysis role calling propose_remediation_action -> must return error
        perf_ctx = SecurityContext(
            caller_id="analyst-01",
            role=Role.PERFORMANCE_ANALYSIS,
            tenant_id="customer_a"
        )
        rpc_res = self.server.handle_tools_call(
            tool_name="propose_remediation_action",
            arguments={
                "target_entity_id": "CSR_ALPHA_01",
                "action_type": "REBOOT",
                "justification": "test",
                "blast_radius_summary": "test",
                "rollback_procedure": "test"
            },
            context=perf_ctx
        )
        self.assertTrue(rpc_res["isError"])
        self.assertEqual(rpc_res["error"]["code"], 403)

if __name__ == "__main__":
    unittest.main()


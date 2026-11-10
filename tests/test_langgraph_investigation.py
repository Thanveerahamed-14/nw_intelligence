"""
Tests for the LangGraph investigation workflow.

These tests pin the shape of the compiled graph and the conditional routing that
guards remediation: only genuine, measurably degraded incidents may proceed to
LLM synthesis and action staging.
"""

import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from app.topology_engine.graph import TemporalTopologyGraph
from app.topology_engine.traversal import TopologyTraversalService
from app.kpi_engine.quality import KPIService
from app.mcp.tools import MCPToolRegistry
from app.agents.investigation_graph import InvestigationGraph
from data.seed_data import populate_sample_environment

INCIDENT_TIME = datetime(2026, 11, 10, 10, 5, tzinfo=timezone.utc)
HEALTHY_TIME = datetime(2026, 11, 10, 9, 35, tzinfo=timezone.utc)

EXPECTED_NODES = {
    "topology_discovery",
    "shared_dependencies",
    "kpi_extraction",
    "evidence_integrity",
    "halt",
    "no_action",
    "synthesize_and_stage",
}

EXPECTED_EDGES = {
    ("__start__", "topology_discovery"),
    ("topology_discovery", "shared_dependencies"),
    ("shared_dependencies", "kpi_extraction"),
    ("kpi_extraction", "evidence_integrity"),
    ("evidence_integrity", "halt"),
    ("evidence_integrity", "no_action"),
    ("evidence_integrity", "synthesize_and_stage"),
    ("halt", "__end__"),
    ("no_action", "__end__"),
    ("synthesize_and_stage", "__end__"),
}


class TestInvestigationGraph(unittest.TestCase):
    def setUp(self):
        graph = TemporalTopologyGraph()
        kpi_service = KPIService()
        populate_sample_environment(graph, kpi_service)
        registry = MCPToolRegistry(TopologyTraversalService(graph), kpi_service)
        self.workflow = InvestigationGraph(registry)

    def test_compiled_graph_structure(self):
        drawn = self.workflow.graph.get_graph()
        self.assertEqual(set(drawn.nodes), EXPECTED_NODES | {"__start__", "__end__"})
        self.assertEqual({(e.source, e.target) for e in drawn.edges}, EXPECTED_EDGES)

    def test_mermaid_rendering_available(self):
        mermaid = self.workflow.to_mermaid()
        self.assertIn("flowchart", mermaid)
        for node in EXPECTED_NODES:
            self.assertIn(node, mermaid)

    def test_missing_telemetry_routes_to_halt_without_llm(self):
        # If synthesis were reached, this patch would raise and fail the test.
        with patch(
            "app.vector_store.get_vector_store",
            side_effect=AssertionError("halt route must not call the vector store / LLM"),
        ):
            state = self.workflow.run("customer_a", ["CELL_099"], INCIDENT_TIME)

        self.assertEqual(state["decision"], "halt")
        self.assertIsNone(state["staged_action"])
        self.assertEqual(
            state["quality_eval"]["CELL_099"]["verdict"], "DATA_GAP_OR_UNCERTAINTY"
        )
        self.assertIn("INVESTIGATION HALTED", state["root_cause_summary"])
        self.assertEqual(len(state["steps"]), 5)
        self.assertEqual(state["steps"][-1]["phase_type"], "DECISION_GATE")

    def test_nominal_performance_routes_to_no_action_without_llm(self):
        with patch(
            "app.vector_store.get_vector_store",
            side_effect=AssertionError("no_action route must not call the vector store / LLM"),
        ):
            state = self.workflow.run("customer_a", ["CELL_001"], HEALTHY_TIME)

        self.assertEqual(state["decision"], "no_action")
        self.assertIsNone(state["staged_action"])
        self.assertEqual(
            state["quality_eval"]["CELL_001"]["verdict"], "NOMINAL_PERFORMANCE"
        )
        self.assertIn("NO REMEDIATION REQUIRED", state["root_cause_summary"])
        self.assertEqual(len(state["steps"]), 5)
        self.assertEqual(state["steps"][-1]["phase_type"], "DECISION_GATE")

    def test_degraded_incident_routes_to_synthesis_and_staging(self):
        state = self.workflow.run("customer_a", ["CELL_001", "CELL_002", "CELL_003"], INCIDENT_TIME)

        self.assertEqual(state["decision"], "propose")
        self.assertEqual(state["target_id"], "LINK_BACKHAUL_09")
        self.assertIsNotNone(state["staged_action"])
        self.assertEqual(state["staged_action"]["status"], "PENDING_APPROVAL")
        self.assertEqual(len(state["steps"]), 5)
        self.assertEqual(state["steps"][-1]["phase_type"], "LLM_SYNTHESIS")

    def test_empty_affected_cells_rejected(self):
        with self.assertRaises(ValueError):
            self.workflow.run("customer_a", [], INCIDENT_TIME)


if __name__ == "__main__":
    unittest.main()

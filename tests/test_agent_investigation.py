"""
Integration Tests for the Autonomous Role-Based Agent Workflows.
Simulates the end-to-end 10:05 UTC incident scenario used across the platform demo.
"""

import unittest
from datetime import datetime, timezone
from app.topology_engine.graph import TemporalTopologyGraph
from app.topology_engine.traversal import TopologyTraversalService
from app.kpi_engine.quality import KPIService
from app.mcp.tools import MCPToolRegistry
from app.agents.orchestrator import AgentOrchestrationHub
from app.agents.human_in_the_loop import get_hitl_manager, ActionStatus
from data.seed_data import populate_sample_environment

class TestAgentInvestigation(unittest.TestCase):
    def setUp(self):
        self.graph = TemporalTopologyGraph()
        self.kpi_service = KPIService()
        self.incident_time, self.affected_cells = populate_sample_environment(self.graph, self.kpi_service)
        
        self.traversal = TopologyTraversalService(self.graph)
        self.registry = MCPToolRegistry(self.traversal, self.kpi_service)
        self.hub = AgentOrchestrationHub(self.registry)
        self.hitl = get_hitl_manager()

    def test_e2e_incident_investigation_success(self):
        report = self.hub.run_alarm_investigation(
            tenant_id="customer_a",
            affected_cells=self.affected_cells,
            incident_time=self.incident_time
        )

        # 1. SLA Verification
        self.assertTrue(report.sla_target_met)
        self.assertLess(report.total_duration_ms, 30000.0)

        # 2. Step execution check
        self.assertEqual(len(report.execution_steps), 5)
        step_names = [s.step_name for s in report.execution_steps]
        self.assertIn("Topology Neighborhood Discovery", step_names)
        self.assertIn("Correlate Shared Infrastructure Dependencies", step_names)
        self.assertIn("Temporal KPI Extraction (Pre & Post Incident)", step_names)
        self.assertIn("Evidence Integrity & Uncertainty Verification", step_names)
        self.assertIn("Root Cause Synthesis & Remediation Staging", step_names)

        # 3. Shared Dependency Detection
        shared_ids = [s["id"] for s in report.shared_dependencies_found]
        self.assertTrue("CSR_ALPHA_01" in shared_ids or "LINK_BACKHAUL_09" in shared_ids)

        # 4. Data Quality Verdict
        self.assertIn("CELL_001", report.data_quality_assessment)
        self.assertEqual(report.data_quality_assessment["CELL_001"]["verdict"], "GENUINE_NETWORK_PROBLEM")

        # 5. Remediation Staged with HITL
        self.assertIsNotNone(report.recommended_action)
        self.assertEqual(report.recommended_action["status"], ActionStatus.PENDING_APPROVAL.value)

    def test_investigation_declines_remediation_on_missing_telemetry(self):
        """
        When investigating a cell with missing data (CELL_099),
        the agent must decline to recommend an operational network action!
        """
        report = self.hub.run_alarm_investigation(
            tenant_id="customer_a",
            affected_cells=["CELL_099"],
            incident_time=self.incident_time
        )

        # Confirm data quality status is uncertainty
        eval_99 = report.data_quality_assessment.get("CELL_099", {})
        self.assertEqual(eval_99.get("verdict"), "DATA_GAP_OR_UNCERTAINTY")

        # Confirm agent stopped and declined action
        self.assertIsNone(report.recommended_action)
        self.assertIn("INVESTIGATION HALTED / NO REMEDIATION PROPOSED", report.root_cause_summary)

if __name__ == "__main__":
    unittest.main()


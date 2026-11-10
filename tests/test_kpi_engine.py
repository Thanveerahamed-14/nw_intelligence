"""
Unit Tests for Capability 2: KPI Engine & Data Quality.
Verifies 15-minute rollups, late data arrival, completeness scoring,
and distinguishing genuine network failures from missing data.
"""

import unittest
from datetime import datetime, timezone, timedelta
from app.kpi_engine.quality import KPIService
from app.kpi_engine.calculator import KPICalculator
from app.kpi_engine.models import DataQualityStatus

class TestKPIEngine(unittest.TestCase):
    def setUp(self):
        self.kpi_service = KPIService()
        self.t_window = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)
        self.tenant = "customer_a"

    def test_window_kpi_calculation(self):
        counters = {
            "cell_downtime_seconds": 0.0,
            "rrc_connection_attempts": 1000.0,
            "rrc_connection_successes": 995.0,
            "prb_used_dl": 50.0,
            "prb_available_dl": 100.0
        }
        kpis = KPICalculator.calculate_window_kpis(
            entity_id="CELL_001",
            tenant_id=self.tenant,
            window_start=self.t_window,
            aggregated_counters=counters,
            sample_count=3,
            expected_samples=3
        )
        avail = next(k for k in kpis if k.kpi_name == "CELL_AVAILABILITY")
        self.assertEqual(avail.value, 100.0)
        self.assertEqual(avail.quality_status, DataQualityStatus.COMPLETE)
        self.assertEqual(avail.completeness_score, 1.0)
        self.assertFalse(avail.is_uncertain)

        rrc = next(k for k in kpis if k.kpi_name == "RRC_SETUP_SUCCESS_RATE")
        self.assertEqual(rrc.value, 99.5)

    def test_late_data_incremental_recalculation(self):
        # 1. Ingest initial sample
        self.kpi_service.ingest_counters(
            tenant_id=self.tenant,
            entity_id="CELL_001",
            timestamp=self.t_window,
            counters={"cell_downtime_seconds": 150.0},
            provenance_hash="hash1"
        )
        kpis_initial = self.kpi_service.get_entity_kpis(
            self.tenant, "CELL_001", self.t_window, self.t_window + timedelta(minutes=15)
        )
        avail_initial = next(k for k in kpis_initial if k.kpi_name == "CELL_AVAILABILITY")
        self.assertEqual(avail_initial.sample_count, 1)
        self.assertEqual(avail_initial.revision, 1)

        # 2. Ingest late-arriving sample for same window
        self.kpi_service.ingest_counters(
            tenant_id=self.tenant,
            entity_id="CELL_001",
            timestamp=self.t_window + timedelta(minutes=5),
            counters={"cell_downtime_seconds": 150.0},
            provenance_hash="hash2"
        )
        kpis_updated = self.kpi_service.get_entity_kpis(
            self.tenant, "CELL_001", self.t_window, self.t_window + timedelta(minutes=15)
        )
        avail_updated = next(k for k in kpis_updated if k.kpi_name == "CELL_AVAILABILITY")
        self.assertEqual(avail_updated.sample_count, 2)
        # Total downtime is now 300s -> avail = 100*(1 - 300/900) = 66.67%
        self.assertEqual(avail_updated.value, 66.67)

    def test_evidence_integrity_genuine_vs_missing_telemetry(self):
        # Entity 1: Complete telemetry, real downtime
        for offset in [0, 5, 10]:
            self.kpi_service.ingest_counters(
                tenant_id=self.tenant,
                entity_id="CELL_REAL_OUTAGE",
                timestamp=self.t_window + timedelta(minutes=offset),
                counters={"cell_downtime_seconds": 300.0},
                provenance_hash=f"h_{offset}"
            )

        # Entity 2: Incomplete telemetry (only 1 sample out of 3)
        self.kpi_service.ingest_counters(
            tenant_id=self.tenant,
            entity_id="CELL_MISSING_DATA",
            timestamp=self.t_window,
            counters={"cell_downtime_seconds": 100.0},
            provenance_hash="h_single"
        )

        assessments = self.kpi_service.verify_evidence_integrity(
            tenant_id=self.tenant,
            entity_ids=["CELL_REAL_OUTAGE", "CELL_MISSING_DATA"],
            window_start=self.t_window,
            window_end=self.t_window + timedelta(minutes=15)
        )

        # Confirm Entity 1 is flagged as genuine network problem
        self.assertTrue(assessments["CELL_REAL_OUTAGE"].is_genuine_outage)
        self.assertEqual(assessments["CELL_REAL_OUTAGE"].confidence, 1.0)
        self.assertIn("GENUINE_NETWORK_PROBLEM", assessments["CELL_REAL_OUTAGE"].explanation)

        # Confirm Entity 2 is flagged as uncertainty / data gap
        self.assertFalse(assessments["CELL_MISSING_DATA"].is_genuine_outage)
        self.assertIn("UNRESOLVED_UNCERTAINTY", assessments["CELL_MISSING_DATA"].explanation)

if __name__ == "__main__":
    unittest.main()

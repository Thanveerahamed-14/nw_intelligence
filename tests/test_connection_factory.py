"""
Unit Tests for Capability 1: Connection Factory.
Verifies vendor normalization, provenance hashing, deduplication, and conflict resolution.
"""

import unittest
from datetime import datetime, timezone
from app.connection_factory.normalizer import Normalizer
from app.connection_factory.provenance import compute_payload_hash, create_provenance
from app.connection_factory.validator import IngestionValidator, ConflictResolutionPolicy

class TestConnectionFactory(unittest.TestCase):
    def setUp(self):
        self.validator = IngestionValidator()
        self.now = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)

    def test_vendor_normalization_ericsson(self):
        raw_counters = {
            "pmCellDowntimeAuto": 300,
            "pmRrcConnEstabAtt": 1500,
            "pmRrcConnEstabSucc": 1495,
            "pmRadioTxRank2": 450
        }
        canonical, prov = Normalizer.normalize_performance_counters(
            vendor="Ericsson",
            entity_id="CELL_001",
            timestamp=self.now,
            raw_counters=raw_counters,
            source_system="Ericsson_ENM",
            source_file="bulk_pm_20261110_1000.xml"
        )
        self.assertEqual(canonical["cell_downtime_seconds"], 300.0)
        self.assertEqual(canonical["rrc_connection_attempts"], 1500.0)
        self.assertEqual(canonical["rrc_connection_successes"], 1495.0)
        self.assertEqual(prov.source_vendor, "Ericsson")
        self.assertTrue(len(prov.raw_payload_hash) == 64)

    def test_vendor_normalization_cisco(self):
        raw_counters = {
            "ifOutDiscards": 25000,
            "ifHCOutOctets": 50000000,
            "ifOperStatus": 1
        }
        canonical, prov = Normalizer.normalize_performance_counters(
            vendor="Cisco",
            entity_id="CSR_ALPHA_01",
            timestamp=self.now,
            raw_counters=raw_counters,
            source_system="Cisco_EPN",
            source_file="telemetry_csr01.json"
        )
        self.assertEqual(canonical["packet_discards_out"], 25000.0)
        self.assertEqual(canonical["octets_out"], 50000000.0)

    def test_idempotent_deduplication(self):
        payload = {"cell_downtime_seconds": 0, "rrc_connection_attempts": 100}
        res1 = self.validator.process_record("CELL_001", self.now, "Ericsson_ENM", payload)
        self.assertEqual(res1.status, "ACCEPTED")

        # Ingest exact same payload again
        res2 = self.validator.process_record("CELL_001", self.now, "Ericsson_ENM", payload)
        self.assertEqual(res2.status, "DUPLICATE_IGNORED")

    def test_conflict_resolution_authoritative_priority(self):
        existing_record = {
            "source_system": "ericsson_enm",
            "timestamp": self.now,
            "status": "OPERATIONAL"
        }
        # Incoming passive scanner trying to override authoritative EMS
        incoming_payload = {"status": "DEGRADED"}
        res = self.validator.process_record(
            entity_id="CELL_001",
            timestamp=self.now,
            source_system="passive_crawler",
            payload=incoming_payload,
            existing_record=existing_record
        )
        self.assertEqual(res.status, "CONFLICT_RESOLVED")
        self.assertIn("yielded to existing authoritative source", res.message)

if __name__ == "__main__":
    unittest.main()


"""
Unit Tests for Capability 3: Topology Engine & Bi-Temporal Modeling.
Verifies temporal reconstruction as of 10:05 UTC, bounded 2-hop traversals (<2s),
and shared dependency analysis.
"""

import unittest
from datetime import datetime, timezone, timedelta
from app.topology_engine.models import NetworkEntity, NetworkRelationship, EntityType, RelationshipType
from app.topology_engine.graph import TemporalTopologyGraph
from app.topology_engine.traversal import TopologyTraversalService

class TestTopologyTemporal(unittest.TestCase):
    def setUp(self):
        self.graph = TemporalTopologyGraph()
        self.traversal = TopologyTraversalService(self.graph)
        
        self.t0 = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        self.t_split = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)
        self.t_alarm = datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
        self.tenant = "customer_a"

        # Version 1 of cell (frequency 3500)
        self.cell_v1 = NetworkEntity(
            id="CELL_001",
            tenant_id=self.tenant,
            name="Cell 001 v1",
            entity_type=EntityType.CELL,
            vendor="Ericsson",
            properties={"carrier_freq": 3500},
            valid_from=self.t0,
            valid_to=self.t_split
        )
        # Version 2 of cell (reconfigured at 10:00 to 3600)
        self.cell_v2 = NetworkEntity(
            id="CELL_001",
            tenant_id=self.tenant,
            name="Cell 001 v2",
            entity_type=EntityType.CELL,
            vendor="Ericsson",
            properties={"carrier_freq": 3600},
            valid_from=self.t_split
        )
        self.graph.upsert_entity(self.cell_v1)
        self.graph.upsert_entity(self.cell_v2)

        # Node and Router
        self.node = NetworkEntity(
            id="NODE_42",
            tenant_id=self.tenant,
            name="Node 42",
            entity_type=EntityType.RADIO_NODE,
            vendor="Ericsson",
            valid_from=self.t0
        )
        self.csr = NetworkEntity(
            id="CSR_01",
            tenant_id=self.tenant,
            name="CSR 01",
            entity_type=EntityType.ROUTER,
            vendor="Cisco",
            valid_from=self.t0
        )
        self.graph.upsert_entity(self.node)
        self.graph.upsert_entity(self.csr)

        # Relationships
        self.graph.upsert_relationship(NetworkRelationship(
            id="R1", tenant_id=self.tenant, source_id="CELL_001", target_id="NODE_42",
            rel_type=RelationshipType.HOSTED_ON, valid_from=self.t0
        ))
        self.graph.upsert_relationship(NetworkRelationship(
            id="R2", tenant_id=self.tenant, source_id="NODE_42", target_id="CSR_01",
            rel_type=RelationshipType.CONNECTS_TO, valid_from=self.t0
        ))

    def test_point_in_time_query(self):
        # Query before split (09:00 UTC) -> should return version 1
        e_past = self.graph.get_entity_at("CELL_001", datetime(2026, 11, 10, 9, 0, 0, tzinfo=timezone.utc), self.tenant)
        self.assertIsNotNone(e_past)
        self.assertEqual(e_past.properties["carrier_freq"], 3500)

        # Query during alarm (10:05 UTC) -> should return version 2
        e_alarm = self.graph.get_entity_at("CELL_001", self.t_alarm, self.tenant)
        self.assertIsNotNone(e_alarm)
        self.assertEqual(e_alarm.properties["carrier_freq"], 3600)

    def test_bounded_two_hop_traversal_sla(self):
        res = self.traversal.get_neighborhood("CELL_001", self.t_alarm, self.tenant, max_hops=2)
        self.assertTrue(res.latency_ms < 2000.0, f"Traversal exceeded 2s SLA: {res.latency_ms}ms")
        self.assertEqual(res.hops, 2)
        node_ids = [n["id"] for n in res.nodes]
        self.assertIn("CELL_001", node_ids)
        self.assertIn("NODE_42", node_ids)
        self.assertIn("CSR_01", node_ids)

    def test_shared_dependency_analysis(self):
        # Add another cell connected to NODE_42
        self.graph.upsert_entity(NetworkEntity(
            id="CELL_002", tenant_id=self.tenant, name="Cell 002",
            entity_type=EntityType.CELL, vendor="Ericsson", valid_from=self.t0
        ))
        self.graph.upsert_relationship(NetworkRelationship(
            id="R3", tenant_id=self.tenant, source_id="CELL_002", target_id="NODE_42",
            rel_type=RelationshipType.HOSTED_ON, valid_from=self.t0
        ))

        shared = self.traversal.find_shared_dependencies(["CELL_001", "CELL_002"], self.t_alarm, self.tenant)
        shared_ids = [s["id"] for s in shared["shared_dependencies"]]
        self.assertIn("NODE_42", shared_ids)
        self.assertIn("CSR_01", shared_ids)

if __name__ == "__main__":
    unittest.main()


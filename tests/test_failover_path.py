"""
Deterministic failover-path resolver tests.

The resolver must produce the same bypass path for the same topology snapshot
without any LLM involvement. These tests also pin the policy outcome for the
demo's 10G-primary / 1G-standby pair.
"""

import unittest
from datetime import datetime, timezone

from app.agents.human_in_the_loop import HITLManager
from app.topology_engine.failover import FailoverPathResolver
from app.topology_engine.graph import TemporalTopologyGraph
from app.topology_engine.models import (
    EntityType,
    NetworkEntity,
    NetworkRelationship,
    RelationshipType,
)
from app.topology_engine.traversal import TopologyTraversalService

BASE_TIME = datetime(2026, 1, 1, tzinfo=timezone.utc)
INCIDENT_TIME = datetime(2026, 11, 10, 10, 5, tzinfo=timezone.utc)
TENANT = "customer_a"


def _entity(entity_id, entity_type, properties=None, name=None):
    return NetworkEntity(
        id=entity_id,
        tenant_id=TENANT,
        name=name or entity_id,
        entity_type=entity_type,
        vendor="TestVendor",
        properties=properties or {},
        valid_from=BASE_TIME,
    )


def _rel(rel_id, source, target):
    return NetworkRelationship(
        id=rel_id,
        tenant_id=TENANT,
        source_id=source,
        target_id=target,
        rel_type=RelationshipType.CONNECTS_TO,
        valid_from=BASE_TIME,
    )


def _graph_with(links):
    """Builds CSR -> each link -> AGG with optional radio neighbours."""
    graph = TemporalTopologyGraph()
    entities = [
        _entity("CSR_01", EntityType.ROUTER),
        _entity("AGG_01", EntityType.ROUTER),
        _entity("RADIO_01", EntityType.RADIO_NODE),
    ]
    relationships = [
        _rel("R_RADIO", "RADIO_01", "CSR_01"),
    ]
    for index, (link_id, properties) in enumerate(links.items()):
        entities.append(
            _entity(link_id, EntityType.TRANSPORT_LINK, properties=properties, name=link_id)
        )
        relationships.append(_rel(f"R_CSR_{index}", "CSR_01", link_id))
        relationships.append(_rel(f"R_AGG_{index}", link_id, "AGG_01"))

    for entity in entities:
        graph.upsert_entity(entity)
    for relationship in relationships:
        graph.upsert_relationship(relationship)
    return graph


def _resolver(graph):
    return FailoverPathResolver(TopologyTraversalService(graph))


class TestFailoverPathResolver(unittest.TestCase):
    def test_resolves_seeded_demo_bypass_and_flags_capacity(self):
        from app.kpi_engine.quality import KPIService
        from data.seed_data import populate_sample_environment

        graph = TemporalTopologyGraph()
        populate_sample_environment(graph, KPIService())

        result = _resolver(graph).resolve(TENANT, "LINK_BACKHAUL_09", INCIDENT_TIME)

        self.assertTrue(result["feasible"])
        self.assertEqual(result["reason"], "STANDBY_PATH_CONNECTED")
        self.assertEqual(result["primary"]["id"], "LINK_BACKHAUL_09")
        self.assertEqual(result["standby"]["id"], "LINK_BACKHAUL_STANDBY_09")
        self.assertEqual(
            result["path"],
            ["CSR_ALPHA_01", "LINK_BACKHAUL_STANDBY_09", "AGG_ROUTER_01"],
        )
        self.assertEqual(result["path_label"], "CSR_ALPHA_01 -> LINK_BACKHAUL_STANDBY_09 -> AGG_ROUTER_01")
        self.assertTrue(all(check["passed"] for check in result["checks"][:4]))
        self.assertFalse(result["checks"][4]["passed"])
        self.assertFalse(result["checks"][4]["blocking"])

        capacity = result["capacity"]
        self.assertEqual(capacity["primary_gbps"], 10.0)
        self.assertEqual(capacity["standby_gbps"], 1.0)
        self.assertEqual(capacity["verdict"], "INSUFFICIENT_FOR_FULL_LOAD")
        self.assertFalse(capacity["sufficient_for_full_load"])

    def test_no_standby_link_returns_no_path(self):
        graph = _graph_with(
            {"LINK_ONLY": {"medium": "SingleMode_Fiber", "capacity_gbps": 10.0, "status": "ACTIVE_PRIMARY"}}
        )

        result = _resolver(graph).resolve(TENANT, "LINK_ONLY", INCIDENT_TIME)

        self.assertFalse(result["feasible"])
        self.assertEqual(result["reason"], "NO_CONNECTED_STANDBY_PATH")
        self.assertIsNone(result["standby"])
        self.assertEqual(result["path"], [])

    def test_disconnected_candidate_is_rejected(self):
        graph = TemporalTopologyGraph()
        for entity in [
            _entity("CSR_01", EntityType.ROUTER),
            _entity("AGG_01", EntityType.ROUTER),
            _entity("LINK_MAIN", EntityType.TRANSPORT_LINK, {"medium": "Fiber", "capacity_gbps": 10.0, "status": "ACTIVE_PRIMARY"}),
            _entity("LINK_ORPHAN", EntityType.TRANSPORT_LINK, {"medium": "Microwave", "capacity_gbps": 1.0, "status": "STANDBY_PROTECTION"}),
        ]:
            graph.upsert_entity(entity)
        for relationship in [
            _rel("R1", "CSR_01", "LINK_MAIN"),
            _rel("R2", "LINK_MAIN", "AGG_01"),
            _rel("R3", "CSR_01", "LINK_ORPHAN"),
        ]:
            graph.upsert_relationship(relationship)

        result = _resolver(graph).resolve(TENANT, "LINK_MAIN", INCIDENT_TIME)

        self.assertFalse(result["feasible"])
        self.assertEqual(result["reason"], "NO_CONNECTED_STANDBY_PATH")
        self.assertEqual(result["candidates"][0]["id"], "LINK_ORPHAN")
        self.assertFalse(result["candidates"][0]["accepted"])

    def test_selection_is_deterministic_by_capacity_then_id(self):
        graph = _graph_with(
            {
                "LINK_PRIMARY": {"medium": "Fiber", "capacity_gbps": 10.0, "status": "ACTIVE_PRIMARY"},
                "LINK_STANDBY_SMALL": {"medium": "Microwave", "capacity_gbps": 1.0, "status": "STANDBY_PROTECTION"},
                "LINK_STANDBY_LARGE": {"medium": "Microwave", "capacity_gbps": 5.0, "status": "STANDBY_PROTECTION"},
            }
        )

        first = _resolver(graph).resolve(TENANT, "LINK_PRIMARY", INCIDENT_TIME)
        second = _resolver(graph).resolve(TENANT, "LINK_PRIMARY", INCIDENT_TIME)

        self.assertEqual(first["standby"]["id"], "LINK_STANDBY_LARGE")
        self.assertEqual(first["path"], second["path"])
        self.assertEqual(first["standby"]["id"], second["standby"]["id"])

    def test_non_transport_primary_is_rejected(self):
        graph = _graph_with(
            {"LINK_PRIMARY": {"medium": "Fiber", "capacity_gbps": 10.0, "status": "ACTIVE_PRIMARY"}}
        )

        result = _resolver(graph).resolve(TENANT, "CSR_01", INCIDENT_TIME)

        self.assertFalse(result["feasible"])
        self.assertEqual(result["reason"], "PRIMARY_NOT_A_TRANSPORT_LINK")


class TestHitlBypassPayload(unittest.TestCase):
    def test_staged_action_preserves_bypass_path(self):
        manager = HITLManager()
        bypass = {
            "resolver": "deterministic_topology_v1",
            "path": ["CSR_01", "LINK_STANDBY", "AGG_01"],
            "feasible": True,
        }

        action = manager.stage_proposal(
            tenant_id=TENANT,
            proposed_by="alarm-agent-01",
            target_entity_id="LINK_PRIMARY",
            action_type="REROUTE_STANDBY_BACKHAUL",
            justification="Deterministic resolver selected the standby path.",
            blast_radius="1 cell",
            rollback="Revert to primary.",
            bypass_path=bypass,
        )

        self.assertEqual(action.bypass_path, bypass)
        self.assertIn("bypass_path", action.model_dump())


if __name__ == "__main__":
    unittest.main()

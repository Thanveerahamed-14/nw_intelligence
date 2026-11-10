"""
Unit Tests for Multi-Tenancy Isolation and Role-Based Access Control (RBAC).
"""

import unittest
from datetime import datetime, timezone
from app.security.rbac import Role, Permission, SecurityContext, ROLE_PERMISSIONS
from app.security.tenancy import TenantContext, TenantIsolationViolationError
from app.agents.human_in_the_loop import HITLManager, ActionStatus
from app.topology_engine.models import NetworkEntity, NetworkRelationship, EntityType, RelationshipType
from app.topology_engine.graph import TemporalTopologyGraph

class TestSecurityAndGovernance(unittest.TestCase):
    def setUp(self):
        self.hitl = HITLManager()
        self.graph = TemporalTopologyGraph()
        self.now = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)

    def test_tenant_context_validation(self):
        # Valid tenant
        with TenantContext("customer_a") as ctx:
            self.assertEqual(ctx.tenant_id, "customer_a")

        # Invalid tenant
        with self.assertRaises(TenantIsolationViolationError):
            with TenantContext("malicious_unregistered_tenant"):
                pass

    def test_cross_tenant_relationship_rejection(self):
        # Add entity for customer_a
        self.graph.upsert_entity(NetworkEntity(
            id="NODE_A", tenant_id="customer_a", name="Node A",
            entity_type=EntityType.RADIO_NODE, vendor="Ericsson", valid_from=self.now
        ))
        # Add entity for customer_b
        self.graph.upsert_entity(NetworkEntity(
            id="NODE_B", tenant_id="customer_b", name="Node B",
            entity_type=EntityType.RADIO_NODE, vendor="Nokia", valid_from=self.now
        ))

        # Trying to update NODE_A under tenant customer_b must fail
        with self.assertRaises(TenantIsolationViolationError):
            self.graph.upsert_entity(NetworkEntity(
                id="NODE_A", tenant_id="customer_b", name="Hijacked Node",
                entity_type=EntityType.RADIO_NODE, vendor="Ericsson", valid_from=self.now
            ))

    def test_role_permission_boundaries(self):
        # Alarm Management cannot approve
        alarm_sec = SecurityContext(caller_id="agent_1", role=Role.ALARM_MANAGEMENT, tenant_id="customer_a")
        self.assertTrue(alarm_sec.has_permission(Permission.TOPOLOGY_READ))
        self.assertTrue(alarm_sec.has_permission(Permission.PROPOSE_ACTION))
        self.assertFalse(alarm_sec.has_permission(Permission.APPROVE_ACTION))
        with self.assertRaises(PermissionError):
            alarm_sec.require_permission(Permission.APPROVE_ACTION)

        # Performance Analysis cannot propose actions
        perf_sec = SecurityContext(caller_id="analyst_1", role=Role.PERFORMANCE_ANALYSIS, tenant_id="customer_a")
        self.assertTrue(perf_sec.has_permission(Permission.KPI_READ))
        self.assertFalse(perf_sec.has_permission(Permission.PROPOSE_ACTION))
        with self.assertRaises(PermissionError):
            perf_sec.require_permission(Permission.PROPOSE_ACTION)

        # Change Planning cannot execute on production directly
        change_sec = SecurityContext(caller_id="planner_1", role=Role.CHANGE_PLANNING, tenant_id="customer_a")
        self.assertTrue(change_sec.has_permission(Permission.SIMULATE_CHANGE))
        self.assertFalse(change_sec.has_permission(Permission.EXECUTE_PRODUCTION_CHANGE))

    def test_hitl_approval_lifecycle(self):
        # 1. Agent stages proposal
        action = self.hitl.stage_proposal(
            tenant_id="customer_a",
            proposed_by="alarm-agent-01",
            target_entity_id="CSR_ALPHA_01",
            action_type="REROUTE_STANDBY_MICROWAVE_BACKHAUL",
            justification="High packet loss on fiber backhaul",
            blast_radius="3 cells, 420 users",
            rollback="Revert BGP path"
        )
        self.assertEqual(action.status, ActionStatus.PENDING_APPROVAL)

        # 2. Agent tries to approve -> Denied
        agent_sec = SecurityContext(caller_id="alarm-agent-01", role=Role.ALARM_MANAGEMENT, tenant_id="customer_a")
        with self.assertRaises(PermissionError):
            self.hitl.approve_and_execute(action.action_id, agent_sec)

        # 3. Human Operator approves -> Success
        human_sec = SecurityContext(caller_id="lead_operator_sarah", role=Role.HUMAN_OPERATOR, tenant_id="customer_a")
        approved = self.hitl.approve_and_execute(action.action_id, human_sec, comment="Checked and approved.")
        self.assertEqual(approved.status, ActionStatus.EXECUTED)
        self.assertEqual(approved.approved_by, "lead_operator_sarah")

if __name__ == "__main__":
    unittest.main()

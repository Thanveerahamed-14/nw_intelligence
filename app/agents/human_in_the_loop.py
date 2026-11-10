"""
Human-In-The-Loop (HITL) Remediation and Approval Manager.
Ensures that autonomous agents CANNOT directly mutate the production network.
Every proposed action is staged in PENDING_APPROVAL and requires human sign-off.
"""

from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field

from app.security.rbac import SecurityContext, Permission, Role
from app.security.tenancy import TenantIsolationViolationError

class ActionStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"

class RemediationAction(BaseModel):
    action_id: str
    tenant_id: str
    proposed_by: str
    target_entity_id: str
    action_type: str
    justification: str
    blast_radius: str
    rollback_procedure: str
    status: ActionStatus = ActionStatus.PENDING_APPROVAL
    staged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    execution_result: Optional[str] = None
    audit_trail: List[str] = Field(default_factory=list)

class HITLManager:
    def __init__(self):
        # In-memory store (backed by Firestore / Cloud SQL in prod)
        self.actions: Dict[str, RemediationAction] = {}

    def stage_proposal(
        self,
        tenant_id: str,
        proposed_by: str,
        target_entity_id: str,
        action_type: str,
        justification: str,
        blast_radius: str,
        rollback: str
    ) -> RemediationAction:
        action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc)
        action = RemediationAction(
            action_id=action_id,
            tenant_id=tenant_id,
            proposed_by=proposed_by,
            target_entity_id=target_entity_id,
            action_type=action_type,
            justification=justification,
            blast_radius=blast_radius,
            rollback_procedure=rollback,
            audit_trail=[f"[{now.isoformat()}] Staged by agent '{proposed_by}'."]
        )
        self.actions[action_id] = action
        return action

    def approve_and_execute(
        self,
        action_id: str,
        approver_context: SecurityContext,
        comment: str = ""
    ) -> RemediationAction:
        """Requires Permission.APPROVE_ACTION (typically HUMAN_OPERATOR role)."""
        approver_context.require_permission(Permission.APPROVE_ACTION)
        
        if action_id not in self.actions:
            raise KeyError(f"Action '{action_id}' not found.")
            
        action = self.actions[action_id]
        if action.tenant_id != approver_context.tenant_id:
            raise TenantIsolationViolationError("Cannot approve actions belonging to another tenant.")

        if action.status != ActionStatus.PENDING_APPROVAL:
            raise ValueError(f"Action '{action_id}' is already in status '{action.status.value}'.")

        now = datetime.now(timezone.utc)
        action.status = ActionStatus.APPROVED
        action.approved_by = approver_context.caller_id
        action.approved_at = now
        action.audit_trail.append(
            f"[{now.isoformat()}] Approved by human operator '{approver_context.caller_id}'. Comment: {comment}"
        )

        # Simulate execution on production network gateway
        action.status = ActionStatus.EXECUTED
        action.execution_result = (
            f"SUCCESS: Executed '{action.action_type}' on '{action.target_entity_id}'. "
            f"Traffic diverted to standby infrastructure. Alarms clearing."
        )
        action.audit_trail.append(f"[{datetime.now(timezone.utc).isoformat()}] Execution confirmed: {action.execution_result}")
        return action

    def reject_action(
        self,
        action_id: str,
        rejector_context: SecurityContext,
        reason: str
    ) -> RemediationAction:
        rejector_context.require_permission(Permission.APPROVE_ACTION)
        if action_id not in self.actions:
            raise KeyError(f"Action '{action_id}' not found.")
            
        action = self.actions[action_id]
        if action.tenant_id != rejector_context.tenant_id:
            raise TenantIsolationViolationError("Cannot access actions belonging to another tenant.")

        now = datetime.now(timezone.utc)
        action.status = ActionStatus.REJECTED
        action.audit_trail.append(f"[{now.isoformat()}] Rejected by '{rejector_context.caller_id}'. Reason: {reason}")
        return action

    def get_action(self, action_id: str, tenant_id: str) -> Optional[RemediationAction]:
        action = self.actions.get(action_id)
        if action and action.tenant_id == tenant_id:
            return action
        return None

    def list_actions(self, tenant_id: str) -> List[RemediationAction]:
        return [a for a in self.actions.values() if a.tenant_id == tenant_id]

# Singleton instance
_hitl_instance = HITLManager()

def get_hitl_manager() -> HITLManager:
    return _hitl_instance


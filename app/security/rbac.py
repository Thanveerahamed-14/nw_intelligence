"""
Role-Based Access Control (RBAC) and Governance Framework.
Implements the exact role boundaries required by the chief solution lead:
1. Alarm Management
2. Performance Analysis
3. Change Planning
4. Human Operator (Approver)
"""

from enum import Enum
from typing import Set, Dict, Optional
from pydantic import BaseModel
from app.security.tenancy import get_current_tenant

class Role(str, Enum):
    ALARM_MANAGEMENT = "alarm_management"
    PERFORMANCE_ANALYSIS = "performance_analysis"
    CHANGE_PLANNING = "change_planning"
    HUMAN_OPERATOR = "human_operator"
    SYSTEM_ADMIN = "system_admin"

class Permission(str, Enum):
    # Topology permissions
    TOPOLOGY_READ = "topology:read"
    TOPOLOGY_WRITE = "topology:write"
    
    # KPI permissions
    KPI_READ = "kpi:read"
    KPI_RECALCULATE = "kpi:recalculate"
    
    # Alarm permissions
    ALARM_READ = "alarm:read"
    ALARM_UPDATE = "alarm:update"
    
    # Action / Change permissions
    PROPOSE_ACTION = "action:propose"
    SIMULATE_CHANGE = "change:simulate"
    APPROVE_ACTION = "action:approve"
    EXECUTE_PRODUCTION_CHANGE = "change:execute_production"

# Strict Role-to-Permission Mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.ALARM_MANAGEMENT: {
        Permission.TOPOLOGY_READ,
        Permission.KPI_READ,
        Permission.ALARM_READ,
        Permission.ALARM_UPDATE,
        Permission.PROPOSE_ACTION  # Can propose, but NEVER approve or execute directly
    },
    Role.PERFORMANCE_ANALYSIS: {
        Permission.TOPOLOGY_READ,
        Permission.KPI_READ,
        Permission.KPI_RECALCULATE,
        Permission.ALARM_READ
        # Note: No PROPOSE_ACTION or SIMULATE_CHANGE
    },
    Role.CHANGE_PLANNING: {
        Permission.TOPOLOGY_READ,
        Permission.KPI_READ,
        Permission.SIMULATE_CHANGE,
        Permission.PROPOSE_ACTION
        # Note: Strictly forbidden from EXECUTE_PRODUCTION_CHANGE without human approval
    },
    Role.HUMAN_OPERATOR: {
        Permission.TOPOLOGY_READ,
        Permission.KPI_READ,
        Permission.ALARM_READ,
        Permission.ALARM_UPDATE,
        Permission.SIMULATE_CHANGE,
        Permission.PROPOSE_ACTION,
        Permission.APPROVE_ACTION,
        Permission.EXECUTE_PRODUCTION_CHANGE  # Human in the loop gatekeeper
    },
    Role.SYSTEM_ADMIN: set(Permission)
}

class SecurityContext(BaseModel):
    caller_id: str
    role: Role
    tenant_id: str
    token: Optional[str] = None

    def has_permission(self, permission: Permission) -> bool:
        allowed = ROLE_PERMISSIONS.get(self.role, set())
        return permission in allowed

    def require_permission(self, permission: Permission):
        if not self.has_permission(permission):
            raise PermissionError(
                f"Access Denied: Caller '{self.caller_id}' with role '{self.role.value}' "
                f"lacks required permission '{permission.value}'."
            )

def build_security_context(caller_id: str, role: Role, tenant_id: Optional[str] = None) -> SecurityContext:
    tenant = tenant_id or get_current_tenant()
    return SecurityContext(caller_id=caller_id, role=role, tenant_id=tenant)

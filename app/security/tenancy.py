"""
Multi-Tenant Isolation Manager.
Enforces strict boundary enforcement across 5 customer telecom networks.
Any cross-tenant query or missing tenant context triggers an authorization exception.
"""

from contextvars import ContextVar
from typing import Optional

# Thread-safe and async-safe context variable holding the current caller's tenant
_current_tenant: ContextVar[Optional[str]] = ContextVar("current_tenant", default=None)

class TenantIsolationViolationError(PermissionError):
    """Raised when an attempt is made to access data from another tenant or without tenant context."""
    pass

class TenantContext:
    """Context manager to establish the active tenant scope for an operation."""
    def __init__(self, tenant_id: str, allowed_tenants: Optional[list[str]] = None):
        from app.config import settings
        self.allowed = allowed_tenants or settings.ALLOWED_TENANTS
        clean_tenant = tenant_id.lower().strip()
        if clean_tenant not in self.allowed:
            raise TenantIsolationViolationError(
                f"Unauthorized tenant ID '{tenant_id}'. Allowed tenants: {self.allowed}"
            )
        self.tenant_id = clean_tenant
        self.token = None

    def __enter__(self):
        self.token = _current_tenant.set(self.tenant_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.token:
            _current_tenant.reset(self.token)

def get_current_tenant() -> str:
    """Retrieves the active tenant ID. Fails if no tenant context is established."""
    tenant = _current_tenant.get()
    if not tenant:
        raise TenantIsolationViolationError(
            "Security violation: Operation attempted without an authenticated tenant context."
        )
    return tenant

def set_current_tenant(tenant_id: str):
    """Sets the active tenant directly for the current execution context."""
    from app.config import settings
    clean_tenant = tenant_id.lower().strip()
    if clean_tenant not in settings.ALLOWED_TENANTS:
        raise TenantIsolationViolationError(f"Invalid tenant: '{tenant_id}'")
    _current_tenant.set(clean_tenant)


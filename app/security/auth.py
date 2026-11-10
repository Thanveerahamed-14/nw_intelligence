"""
API Authentication and Principal Resolution.

Every caller is resolved server-side from an ``X-API-Key`` header. Request
payloads and query strings can never choose their own ``caller_id``, ``role``
or ``tenant_id`` -- those are properties of the authenticated principal.

Two operating modes:

* **Keyed mode** -- ``API_KEYS`` contains at least one key. Every request must
  present a valid ``X-API-Key``; missing/unknown keys receive HTTP 401.
* **Demo mode** -- ``API_KEYS`` is empty and ``DEMO_MODE`` is true. A single,
  fixed, non-escalatable demo principal is used so the bundled dashboard runs
  without external configuration. Disable this before exposing the service.
"""

import json
from typing import Dict, List, Optional

from fastapi import Header, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.security.rbac import Role, SecurityContext


class Principal(BaseModel):
    """Authenticated caller identity. Never derived from client-supplied fields."""

    caller_id: str
    role: Role
    tenant_ids: List[str] = Field(default_factory=list)

    def authorize_tenant(self, requested: Optional[str] = None) -> str:
        """Returns the effective tenant, or raises 403 if the principal may not use it."""
        if not self.tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Principal '{self.caller_id}' is not scoped to any tenant.",
            )
        target = (requested or self.tenant_ids[0]).lower().strip()
        if target not in self.tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Principal '{self.caller_id}' with role '{self.role.value}' "
                    f"is not authorized for tenant '{target}'."
                ),
            )
        return target

    def to_context(self, tenant_id: str) -> SecurityContext:
        return SecurityContext(caller_id=self.caller_id, role=self.role, tenant_id=tenant_id)

    def require_role(self, *allowed: Role) -> None:
        if self.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Principal '{self.caller_id}' with role '{self.role.value}' "
                    f"requires one of: {', '.join(r.value for r in allowed)}."
                ),
            )


def _parse_key(api_key: str, spec: Dict) -> Principal:
    try:
        role = Role(spec["role"])
    except KeyError as exc:
        raise RuntimeError(f"API key entry is missing '{exc.args[0]}'.") from exc
    except ValueError as exc:
        raise RuntimeError(f"API key entry has unknown role '{spec.get('role')}'.") from exc

    tenant_ids = spec.get("tenant_ids") or spec.get("tenants")
    if not tenant_ids:
        raise RuntimeError("API key entry is missing 'tenant_ids'.")
    if isinstance(tenant_ids, str):
        tenant_ids = [t.strip() for t in tenant_ids.split(",") if t.strip()]

    return Principal(
        caller_id=spec.get("caller_id", api_key[:8]),
        role=role,
        tenant_ids=list(tenant_ids),
    )


def load_api_keys() -> Dict[str, Principal]:
    raw = (settings.API_KEYS or "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("API_KEYS must be a valid JSON object.") from exc
    if not isinstance(data, dict):
        raise RuntimeError("API_KEYS must be a JSON object mapping key -> principal.")
    return {key: _parse_key(key, spec) for key, spec in data.items()}


def _demo_principal() -> Principal:
    try:
        role = Role(settings.DEMO_ROLE)
    except ValueError as exc:
        raise RuntimeError(f"DEMO_ROLE '{settings.DEMO_ROLE}' is not a valid role.") from exc
    return Principal(
        caller_id=settings.DEMO_CALLER_ID,
        role=role,
        tenant_ids=settings.get_demo_tenants(),
    )


def resolve_principal(x_api_key: Optional[str]) -> Principal:
    keys = load_api_keys()
    if keys:
        if x_api_key and x_api_key in keys:
            return keys[x_api_key]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if settings.DEMO_MODE:
        return _demo_principal()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication is required but no API_KEYS are configured.",
        headers={"WWW-Authenticate": "ApiKey"},
    )


def get_principal(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> Principal:
    """FastAPI dependency resolving the authenticated principal."""
    return resolve_principal(x_api_key)

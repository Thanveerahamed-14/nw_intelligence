"""
Pydantic API Schemas and Request/Response Models.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class InvestigationRequest(BaseModel):
    tenant_id: str = Field(default="customer_a", description="Customer tenant ID (must be authorized for the API key)")
    affected_cells: List[str] = Field(
        default=["CELL_001", "CELL_002", "CELL_003"],
        min_length=1,
        description="List of cell identifiers triggering alarms (at least one required)"
    )
    incident_time: Optional[datetime] = Field(
        default=None,
        description="Timestamp of incident trigger (defaults to 10:05 UTC)"
    )

class ChangeSimulationRequest(BaseModel):
    tenant_id: str = Field(default="customer_a")
    target_entity_id: str = Field(default="CSR_ALPHA_01")
    change_type: str = Field(default="REROUTE_STANDBY_MICROWAVE_BACKHAUL")

class ActionApprovalRequest(BaseModel):
    # Identity is resolved from the authenticated principal, never from the body.
    tenant_id: Optional[str] = Field(default=None, description="Optional tenant override; must be authorized for the caller")
    comment: str = Field(default="Approved after evidence review.")

class ActionRejectionRequest(BaseModel):
    # Identity is resolved from the authenticated principal, never from the body.
    tenant_id: Optional[str] = Field(default=None, description="Optional tenant override; must be authorized for the caller")
    reason: str = Field(default="Insufficient evidence or high traffic hour.")

class MCPRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None
    id: Optional[Any] = 1


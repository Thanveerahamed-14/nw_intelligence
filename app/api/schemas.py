"""
Pydantic API Schemas and Request/Response Models.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class InvestigationRequest(BaseModel):
    tenant_id: str = Field(default="customer_a", description="Customer tenant ID")
    affected_cells: List[str] = Field(
        default=["CELL_001", "CELL_002", "CELL_003"],
        description="List of cell identifiers triggering alarms"
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
    caller_id: str = Field(default="noc_tier2_lead_sarah")
    tenant_id: str = Field(default="customer_a")
    comment: str = Field(default="Verified redundant microwave capacity and alarm correlation. Approved.")

class ActionRejectionRequest(BaseModel):
    caller_id: str = Field(default="noc_tier2_lead_sarah")
    tenant_id: str = Field(default="customer_a")
    reason: str = Field(default="Insufficient evidence or high traffic hour.")

class MCPRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None
    id: Optional[Any] = 1

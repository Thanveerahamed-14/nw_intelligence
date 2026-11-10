"""
Topology Data Models with Bi-Temporal Support.
Captures both Valid Time (real-world state) and System Time (database ingestion time).
"""

from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class EntityType(str, Enum):
    CELL = "cell"
    RADIO_NODE = "radio_node"   # gNodeB / eNodeB
    SITE = "site"               # Physical tower / shelter
    ROUTER = "router"           # Cell Site Router (CSR) / IP-RAN switch
    TRANSPORT_LINK = "transport_link"  # Fiber span or microwave link
    CORE_GATEWAY = "core_gateway"      # UPF / SGW
    NETWORK_SLICE = "network_slice"    # eMBB, URLLC, IoT

class RelationshipType(str, Enum):
    HOSTED_ON = "HOSTED_ON"        # Cell -> Radio Node; Radio Node -> Site
    CONNECTS_TO = "CONNECTS_TO"    # Radio Node -> CSR; CSR -> Transport Link
    DEPENDS_ON = "DEPENDS_ON"      # Slice -> Transport Link / Node
    SERVES = "SERVES"              # Site -> Coverage Area

class NetworkEntity(BaseModel):
    id: str
    tenant_id: str
    name: str
    entity_type: EntityType
    vendor: str
    properties: Dict[str, Any] = Field(default_factory=dict)
    
    # Bi-Temporal Boundaries
    valid_from: datetime
    valid_to: Optional[datetime] = None  # None indicates currently active
    system_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    system_to: Optional[datetime] = None

    def is_valid_at(self, as_of: datetime) -> bool:
        """Determines if the entity was physically active at time 'as_of'."""
        if as_of < self.valid_from:
            return False
        if self.valid_to is not None and as_of >= self.valid_to:
            return False
        return True

class NetworkRelationship(BaseModel):
    id: str
    tenant_id: str
    source_id: str
    target_id: str
    rel_type: RelationshipType
    properties: Dict[str, Any] = Field(default_factory=dict)
    
    # Bi-Temporal Boundaries
    valid_from: datetime
    valid_to: Optional[datetime] = None
    system_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    system_to: Optional[datetime] = None

    def is_valid_at(self, as_of: datetime) -> bool:
        if as_of < self.valid_from:
            return False
        if self.valid_to is not None and as_of >= self.valid_to:
            return False
        return True

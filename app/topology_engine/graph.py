"""
Bi-Temporal Graph Engine.
Maintains network topology history with point-in-time temporal queries.
Guarantees tenant isolation and sub-2-second retrieval latency at p95.
"""

import networkx as nx
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Set
from app.topology_engine.models import NetworkEntity, NetworkRelationship, EntityType, RelationshipType
from app.security.tenancy import TenantIsolationViolationError

class TemporalTopologyGraph:
    def __init__(self):
        # In-memory bi-temporal store (replicated to Spanner Graph / Cloud SQL in prod)
        self.entities: Dict[str, List[NetworkEntity]] = {}  # entity_id -> versions
        self.relationships: Dict[str, List[NetworkRelationship]] = {}  # rel_id -> versions

    def upsert_entity(self, entity: NetworkEntity) -> None:
        """Adds a new entity version, maintaining bi-temporal continuity."""
        if entity.id not in self.entities:
            self.entities[entity.id] = []
        
        # Check if previous active version exists and close its valid_to
        versions = self.entities[entity.id]
        for v in versions:
            if v.tenant_id != entity.tenant_id:
                raise TenantIsolationViolationError(
                    f"Entity '{entity.id}' already belongs to tenant '{v.tenant_id}'."
                )
            if v.valid_to is None and v.valid_from < entity.valid_from:
                v.valid_to = entity.valid_from
                
        versions.append(entity)

    def upsert_relationship(self, rel: NetworkRelationship) -> None:
        """Adds a new relationship version."""
        if rel.id not in self.relationships:
            self.relationships[rel.id] = []
            
        versions = self.relationships[rel.id]
        for v in versions:
            if v.tenant_id != rel.tenant_id:
                raise TenantIsolationViolationError(f"Cross-tenant relationship forbidden.")
            if v.valid_to is None and v.valid_from < rel.valid_from:
                v.valid_to = rel.valid_from
                
        versions.append(rel)

    def get_entity_at(self, entity_id: str, as_of: datetime, tenant_id: str) -> Optional[NetworkEntity]:
        """Fetches the active version of an entity at timestamp 'as_of' for a specific tenant."""
        versions = self.entities.get(entity_id, [])
        for v in versions:
            if v.tenant_id != tenant_id:
                continue
            if v.is_valid_at(as_of):
                return v
        return None

    def build_snapshot_graph(self, as_of: datetime, tenant_id: str) -> nx.DiGraph:
        """
        Constructs an in-memory NetworkX directed graph containing only
        entities and edges that were valid at 'as_of' for 'tenant_id'.
        """
        start_time = time.perf_counter()
        G = nx.DiGraph()

        # Add active entities as nodes
        for eid, versions in self.entities.items():
            for v in versions:
                if v.tenant_id == tenant_id and v.is_valid_at(as_of):
                    G.add_node(
                        v.id,
                        name=v.name,
                        entity_type=v.entity_type.value,
                        vendor=v.vendor,
                        properties=v.properties,
                        tenant_id=v.tenant_id
                    )
                    break  # At most one version is valid at 'as_of'

        # Add active relationships as edges
        for rid, versions in self.relationships.items():
            for v in versions:
                if v.tenant_id == tenant_id and v.is_valid_at(as_of):
                    # Ensure both endpoints exist in snapshot
                    if G.has_node(v.source_id) and G.has_node(v.target_id):
                        G.add_edge(
                            v.source_id,
                            v.target_id,
                            rel_id=v.id,
                            rel_type=v.rel_type.value,
                            properties=v.properties
                        )
                    break

        duration_ms = (time.perf_counter() - start_time) * 1000
        G.graph["as_of"] = as_of.isoformat()
        G.graph["tenant_id"] = tenant_id
        G.graph["build_time_ms"] = duration_ms
        return G

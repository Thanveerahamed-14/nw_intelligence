"""
Topology Traversal and Dependency Correlation.
Optimized for bounded k-hop neighbor lookup (<2s p95 SLA)
and shared dependency analysis across affected network entities.
"""

import time
import networkx as nx
from datetime import datetime
from typing import Dict, List, Set, Any, Optional
from app.topology_engine.graph import TemporalTopologyGraph
from app.config import settings

class TraversalResult:
    def __init__(self, seed_entity_id: str, as_of: datetime, hops: int, latency_ms: float):
        self.seed_entity_id = seed_entity_id
        self.as_of = as_of
        self.hops = hops
        self.latency_ms = latency_ms
        self.nodes: List[Dict[str, Any]] = []
        self.edges: List[Dict[str, Any]] = []
        self.truncated: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "seed_entity_id": self.seed_entity_id,
            "as_of": self.as_of.isoformat(),
            "max_hops": self.hops,
            "latency_ms": round(self.latency_ms, 2),
            "sla_met": self.latency_ms <= (settings.TOPOLOGY_QUERY_TIMEOUT_SECONDS * 1000),
            "node_count": len(self.nodes),
            "edge_count": len(self.edges),
            "truncated": self.truncated,
            "nodes": self.nodes,
            "edges": self.edges
        }

class TopologyTraversalService:
    def __init__(self, graph: TemporalTopologyGraph):
        self.graph = graph

    def get_neighborhood(
        self,
        entity_id: str,
        as_of: datetime,
        tenant_id: str,
        max_hops: int = 2
    ) -> TraversalResult:
        """
        Retrieves the bounded k-hop neighborhood around 'entity_id' as of timestamp 'as_of'.
        Strictly limits max_hops to prevent runaway queries and guarantees sub-2s latency.
        """
        start_time = time.perf_counter()
        bounded_hops = min(max_hops, settings.TOPOLOGY_MAX_HOPS_ABSOLUTE_LIMIT)
        
        # Build snapshot graph for tenant
        G = self.graph.build_snapshot_graph(as_of, tenant_id)
        
        duration_ms = (time.perf_counter() - start_time) * 1000
        result = TraversalResult(seed_entity_id=entity_id, as_of=as_of, hops=bounded_hops, latency_ms=duration_ms)

        if not G.has_node(entity_id):
            return result

        # Bounded Breadth-First-Search (undirected expansion to discover both parents and children)
        G_undirected = G.to_undirected(as_view=True)
        visited_nodes: Set[str] = set()
        
        # Use single_source_shortest_path_length bounded by cutoff
        lengths = nx.single_source_shortest_path_length(G_undirected, entity_id, cutoff=bounded_hops)
        
        node_limit = settings.MAX_TOPOLOGY_NODES_PER_RESPONSE
        collected_node_ids = list(lengths.keys())
        if len(collected_node_ids) > node_limit:
            collected_node_ids = collected_node_ids[:node_limit]
            result.truncated = True

        for nid in collected_node_ids:
            data = G.nodes[nid]
            result.nodes.append({
                "id": nid,
                "name": data.get("name", nid),
                "entity_type": data.get("entity_type"),
                "vendor": data.get("vendor"),
                "properties": data.get("properties", {}),
                "distance_hops": lengths[nid]
            })

        subgraph_nodes = set(collected_node_ids)
        for u, v, data in G.edges(data=True):
            if u in subgraph_nodes and v in subgraph_nodes:
                result.edges.append({
                    "source": u,
                    "target": v,
                    "rel_type": data.get("rel_type"),
                    "properties": data.get("properties", {})
                })

        total_latency_ms = (time.perf_counter() - start_time) * 1000
        result.latency_ms = total_latency_ms
        return result

    def find_shared_dependencies(
        self,
        entity_ids: List[str],
        as_of: datetime,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Analyzes the upstream and downstream graph of multiple entities to detect
        common single-points-of-failure (e.g. shared site router, transport link, or site).
        """
        start_time = time.perf_counter()
        G = self.graph.build_snapshot_graph(as_of, tenant_id)
        
        if not entity_ids:
            return {"shared_dependencies": [], "latency_ms": 0.0}

        # Collect upstream reachable sets (following outgoing edges in dependency direction)
        reachable_sets: List[Set[str]] = []
        for eid in entity_ids:
            if G.has_node(eid):
                # Discover entities reachable within 3 hops
                lengths = nx.single_source_shortest_path_length(G, eid, cutoff=3)
                reachable_sets.append(set(lengths.keys()) - {eid})
            else:
                reachable_sets.append(set())

        # Intersect sets to find shared entities
        if reachable_sets and all(len(s) > 0 for s in reachable_sets):
            common_nodes = set.intersection(*reachable_sets)
        else:
            common_nodes = set()

        shared_entities = []
        for nid in common_nodes:
            data = G.nodes[nid]
            shared_entities.append({
                "id": nid,
                "name": data.get("name", nid),
                "entity_type": data.get("entity_type"),
                "vendor": data.get("vendor"),
                "properties": data.get("properties", {})
            })

        duration_ms = (time.perf_counter() - start_time) * 1000
        return {
            "queried_entities": entity_ids,
            "shared_dependencies": shared_entities,
            "shared_count": len(shared_entities),
            "as_of": as_of.isoformat(),
            "latency_ms": round(duration_ms, 2),
            "sla_met": duration_ms <= (settings.TOPOLOGY_QUERY_TIMEOUT_SECONDS * 1000)
        }


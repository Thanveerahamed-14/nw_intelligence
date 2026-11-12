"""
Deterministic failover-path resolution.

Given a failed transport link, this module resolves the standby bypass path
from the topology snapshot using fixed, replayable rules:

1. Start from the failed transport link.
2. Read its two non-link endpoints (cell-site router and aggregation router)
   from the snapshot.
3. Look for another transport link that shares both endpoints.
4. Prefer links whose status/name/medium is explicitly standby/protection,
   then higher capacity, then lexical ID.
5. Check whether the standby can carry the primary's full capacity.

There are deliberately no LLM calls here. The AI may explain the result, but
it cannot choose or invent the path. Feasibility and capacity are facts that
must survive model failover and be auditable.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from app.topology_engine.traversal import TopologyTraversalService

STANDBY_MARKERS = ("standby", "protect", "backup", "spare")
UNHEALTHY_MARKERS = ("failed", "down", "decommissioned", "out_of_service", "out-of-service")

# Policy thresholds for capacity headroom on the standby path.
FULL_LOAD_RATIO = 0.8
REDUCED_LOAD_RATIO = 0.4


def _as_positive_float(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _node_summary(node: Dict[str, Any]) -> Dict[str, Any]:
    props = node.get("properties") or {}
    return {
        "id": node.get("id"),
        "name": node.get("name"),
        "entity_type": node.get("entity_type"),
        "vendor": node.get("vendor"),
        "medium": props.get("medium"),
        "capacity_gbps": _as_positive_float(props.get("capacity_gbps")),
        "status": props.get("status"),
    }


def _marker_score(node: Dict[str, Any]) -> int:
    haystack = " ".join(
        str(value or "").lower()
        for value in (
            node.get("id"),
            node.get("name"),
            (node.get("properties") or {}).get("status"),
            (node.get("properties") or {}).get("medium"),
        )
    )
    return 2 if any(marker in haystack for marker in STANDBY_MARKERS) else 0


def _is_unhealthy(node: Dict[str, Any]) -> bool:
    status = str((node.get("properties") or {}).get("status") or "").lower()
    return any(marker in status for marker in UNHEALTHY_MARKERS)


class FailoverPathResolver:
    """Resolves a standby bypass using topology facts only."""

    def __init__(self, topology_service: TopologyTraversalService):
        self.topology_service = topology_service

    def resolve(
        self,
        tenant_id: str,
        primary_entity_id: str,
        as_of: datetime,
        max_hops: int = 2,
    ) -> Dict[str, Any]:
        neighborhood = self.topology_service.get_neighborhood(
            primary_entity_id, as_of, tenant_id, max_hops
        )
        nodes = {node["id"]: node for node in neighborhood.nodes}
        result: Dict[str, Any] = {
            "resolver": "deterministic_topology_v1",
            "selection_rule": (
                "Standby link must share both endpoint routers with the failed link; "
                "prefer explicit STANDBY/PROTECTION marking, then highest capacity, "
                "then lexical ID."
            ),
            "tenant_id": tenant_id,
            "as_of": as_of.isoformat() if isinstance(as_of, datetime) else as_of,
            "primary_entity_id": primary_entity_id,
            "primary": _node_summary(nodes[primary_entity_id]) if primary_entity_id in nodes else None,
            "standby": None,
            "path": [],
            "checks": [],
            "candidates": [],
            "capacity": None,
            "feasible": False,
            "reason": None,
        }

        primary = nodes.get(primary_entity_id)
        if not primary or primary.get("entity_type") != "transport_link":
            result["reason"] = "PRIMARY_NOT_A_TRANSPORT_LINK"
            result["checks"].append(
                {
                    "name": "primary_is_transport_link",
                    "passed": False,
                    "detail": f"Entity '{primary_entity_id}' is not a transport link in this snapshot.",
                }
            )
            return result

        adjacency: Dict[str, Set[str]] = {}
        for edge in neighborhood.edges:
            adjacency.setdefault(edge["source"], set()).add(edge["target"])
            adjacency.setdefault(edge["target"], set()).add(edge["source"])

        primary_endpoints = sorted(
            endpoint
            for endpoint in adjacency.get(primary_entity_id, set())
            if nodes.get(endpoint, {}).get("entity_type") != "transport_link"
        )

        if len(primary_endpoints) < 2:
            result["reason"] = "PRIMARY_ENDPOINTS_INCOMPLETE"
            result["checks"].append(
                {
                    "name": "primary_has_two_endpoints",
                    "passed": False,
                    "detail": f"Primary link exposes {len(primary_endpoints)} non-link endpoint(s).",
                }
            )
            return result

        def endpoint_radio_degree(endpoint_id: str) -> int:
            return sum(
                1
                for neighbour in adjacency.get(endpoint_id, set())
                if nodes.get(neighbour, {}).get("entity_type") in ("radio_node", "cell")
            )

        ordered_endpoints = sorted(
            primary_endpoints,
            key=lambda endpoint: (-endpoint_radio_degree(endpoint), endpoint),
        )
        head_end, aggregation = ordered_endpoints[0], ordered_endpoints[-1]

        candidate_links = [
            node
            for node in nodes.values()
            if node.get("entity_type") == "transport_link"
            and node.get("id") != primary_entity_id
        ]

        evaluated: List[Dict[str, Any]] = []
        accepted: List[Dict[str, Any]] = []
        for candidate in candidate_links:
            candidate_endpoints = {
                endpoint
                for endpoint in adjacency.get(candidate["id"], set())
                if nodes.get(endpoint, {}).get("entity_type") != "transport_link"
            }
            shared = sorted(set(primary_endpoints) & candidate_endpoints)
            shares_both = head_end in candidate_endpoints and aggregation in candidate_endpoints
            healthy = not _is_unhealthy(candidate)
            marker_score = _marker_score(candidate)
            capacity = _as_positive_float((candidate.get("properties") or {}).get("capacity_gbps"))

            reasons: List[str] = []
            if not shares_both:
                reasons.append(
                    "does not terminate on both the cell-site router and the aggregation router"
                )
            if not healthy:
                reasons.append("status indicates the link is unavailable")
            evaluated.append(
                {
                    "id": candidate.get("id"),
                    "name": candidate.get("name"),
                    "medium": (candidate.get("properties") or {}).get("medium"),
                    "capacity_gbps": capacity,
                    "status": (candidate.get("properties") or {}).get("status"),
                    "shared_endpoints": shared,
                    "standby_marker": marker_score > 0,
                    "accepted": shares_both and healthy,
                    "rejection_reasons": reasons,
                }
            )
            if shares_both and healthy:
                accepted.append({**candidate, "_capacity": capacity or 0.0, "_marker": marker_score})

        result["candidates"] = evaluated

        if not accepted:
            result["reason"] = "NO_CONNECTED_STANDBY_PATH"
            result["checks"].append(
                {
                    "name": "standby_link_present",
                    "passed": False,
                    "detail": (
                        "No other transport link shares both endpoint routers with the failed link."
                        if candidate_links
                        else "No alternate transport link exists in this topology snapshot."
                    ),
                }
            )
            return result

        accepted.sort(
            key=lambda node: (-node["_marker"], -node["_capacity"], node.get("id") or "")
        )
        standby = accepted[0]

        standby_summary = _node_summary(standby)
        capacity = self._capacity_assessment(primary, standby)
        path = [head_end, standby["id"], aggregation]

        checks = [
            {
                "name": "primary_is_transport_link",
                "passed": True,
                "detail": f"{primary_entity_id} is a transport link in the snapshot.",
            },
            {
                "name": "standby_link_present",
                "passed": True,
                "detail": f"{standby['id']} is an alternate transport link.",
            },
            {
                "name": "shares_both_endpoints",
                "passed": True,
                "detail": (
                    f"{standby['id']} terminates on both {head_end} and {aggregation}, "
                    "so the bypass reconnects the same routers."
                ),
            },
            {
                "name": "standby_not_failed",
                "passed": True,
                "detail": f"Configured status is '{standby_summary['status'] or 'unknown'}'.",
            },
            {
                "name": "capacity_headroom",
                "passed": bool((capacity or {}).get("sufficient_for_full_load")),
                "blocking": False,
                "detail": (capacity or {}).get("summary") or "Capacity could not be compared.",
            },
        ]

        result.update(
            {
                "standby": standby_summary,
                "path": path,
                "path_label": " -> ".join(path),
                "checks": checks,
                "capacity": capacity,
                "feasible": True,
                "reason": "STANDBY_PATH_CONNECTED",
            }
        )
        return result

    @staticmethod
    def _capacity_assessment(
        primary: Dict[str, Any], standby: Dict[str, Any]
    ) -> Dict[str, Any]:
        primary_gbps = _as_positive_float((primary.get("properties") or {}).get("capacity_gbps"))
        standby_gbps = _as_positive_float((standby.get("properties") or {}).get("capacity_gbps"))

        if primary_gbps is None or standby_gbps is None:
            return {
                "primary_gbps": primary_gbps,
                "standby_gbps": standby_gbps,
                "ratio": None,
                "verdict": "UNKNOWN",
                "sufficient_for_full_load": None,
                "policy": {"full_load_ratio": FULL_LOAD_RATIO, "reduced_load_ratio": REDUCED_LOAD_RATIO},
                "summary": "Capacity is not recorded on one or both links; throughput impact is unknown.",
            }

        ratio = round(standby_gbps / primary_gbps, 4)
        if ratio >= FULL_LOAD_RATIO:
            verdict = "FULL_CAPACITY"
            sufficient = True
            summary = (
                f"Standby provides {standby_gbps:g}G against a {primary_gbps:g}G primary "
                f"({ratio * 100:.0f}%); it can carry the full pre-incident load."
            )
        elif ratio >= REDUCED_LOAD_RATIO:
            verdict = "REDUCED_CAPACITY"
            sufficient = False
            summary = (
                f"Standby provides {standby_gbps:g}G against a {primary_gbps:g}G primary "
                f"({ratio * 100:.0f}%); expect degraded throughput after reroute."
            )
        else:
            verdict = "INSUFFICIENT_FOR_FULL_LOAD"
            sufficient = False
            summary = (
                f"Standby provides only {standby_gbps:g}G against a {primary_gbps:g}G primary "
                f"({ratio * 100:.0f}%); the bypass restores reachability but cannot carry "
                "full pre-incident throughput."
            )

        return {
            "primary_gbps": primary_gbps,
            "standby_gbps": standby_gbps,
            "ratio": ratio,
            "verdict": verdict,
            "sufficient_for_full_load": sufficient,
            "policy": {"full_load_ratio": FULL_LOAD_RATIO, "reduced_load_ratio": REDUCED_LOAD_RATIO},
            "summary": summary,
        }

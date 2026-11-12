"""
FastAPI REST Routes and MCP Server Endpoints.

Identity is resolved from the ``X-API-Key`` header (see ``app.security.auth``).
No endpoint accepts a caller-supplied ``caller_id`` or ``role``; tenant access is
authorized against the authenticated principal's tenant scope.
"""

import re
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import List, Optional
from dateutil import parser

from app.api.schemas import (
    InvestigationRequest,
    ChangeSimulationRequest,
    ActionApprovalRequest,
    ActionRejectionRequest,
    MCPRPCRequest
)
from app.security.rbac import Role, Permission
from app.security.tenancy import TenantContext, TenantIsolationViolationError
from app.security.auth import Principal, get_principal

router = APIRouter()

# Globals initialized in main.py
graph = None
kpi_service = None
traversal_service = None
mcp_registry = None
mcp_server = None
orchestration_hub = None
hitl_manager = None

# Cypher constructs that mutate data or perform side effects. The explorer
# endpoint is read-only; anything else must go through a governed change flow.
_CYPHER_WRITE_PATTERN = re.compile(
    r"\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|FOREACH|LOAD\s+CSV|CALL)\b",
    re.IGNORECASE,
)


def init_services(g, kpi, trav, reg, srv, hub, hitl):
    global graph, kpi_service, traversal_service, mcp_registry, mcp_server, orchestration_hub, hitl_manager
    graph = g
    kpi_service = kpi
    traversal_service = trav
    mcp_registry = reg
    mcp_server = srv
    orchestration_hub = hub
    hitl_manager = hitl


def _raise_http(exc: Exception) -> None:
    """Maps domain exceptions to HTTP status codes without masking HTTPException."""
    if isinstance(exc, HTTPException):
        raise exc
    if isinstance(exc, TenantIsolationViolationError):
        raise HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, PermissionError):
        raise HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, (KeyError, ValueError)):
        raise HTTPException(status_code=400, detail=str(exc))
    raise HTTPException(status_code=500, detail=str(exc))


def _require_cypher_read_only(query: str) -> None:
    if _CYPHER_WRITE_PATTERN.search(query):
        raise HTTPException(
            status_code=400,
            detail="Only read-only Cypher queries are permitted on this endpoint.",
        )


def _tenant_context(principal: Principal, requested: Optional[str], permission: Permission):
    tenant_id = principal.authorize_tenant(requested)
    context = principal.to_context(tenant_id)
    context.require_permission(permission)
    return tenant_id, context


@router.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Network Intelligence Platform",
        "engines": {
            "connection_factory": "UP",
            "kpi_engine": "UP",
            "topology_engine": "UP",
            "mcp_server": "UP",
            "hitl_manager": "UP"
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/system/status")
def system_status(principal: Principal = Depends(get_principal)):
    from app.ai import get_ai_service
    from app.vector_store import get_vector_store
    from app.graph_db import get_graph_db
    from app.config import settings

    ai = get_ai_service()
    vs = get_vector_store()
    gdb = get_graph_db()

    relational_db = {"status": "ONLINE"}
    graph_status = gdb.get_status()
    if principal.role == Role.SYSTEM_ADMIN:
        # Connection strings are only disclosed to platform administrators.
        relational_db["url"] = settings.DATABASE_URL
    else:
        graph_status.pop("uri", None)

    return {
        "ai": ai.get_status(),
        "vector_db": {
            "type": settings.VECTOR_DB_TYPE,
            "engine": "ChromaDB (Persistent Local Vector Store)",
            "persist_directory": settings.CHROMA_PERSIST_DIRECTORY,
            "indexed_runbooks_count": vs.collection.count(),
            "status": "ONLINE"
        },
        "graph_db": graph_status,
        "relational_db": relational_db,
        "multi_tenancy": {
            "tenants": settings.get_allowed_tenants(),
            "isolation": "STRICT_PER_CUSTOMER"
        },
        "caller": {
            "caller_id": principal.caller_id,
            "role": principal.role.value,
            "tenant_ids": principal.tenant_ids,
        }
    }

@router.get("/ai/status")
def ai_status(principal: Principal = Depends(get_principal)):
    """Reports the configured Gemini model cascade and last observed call."""
    try:
        _tenant_context(principal, None, Permission.ALARM_READ)
        from app.ai import get_ai_service
        return get_ai_service().get_status()
    except Exception as e:
        _raise_http(e)

@router.post("/ai/probe")
def ai_probe(principal: Principal = Depends(get_principal)):
    """Actively exercises every model in the cascade (costs one short LLM call)."""
    try:
        _tenant_context(principal, None, Permission.ALARM_READ)
        from app.ai import get_ai_service
        return get_ai_service().probe()
    except Exception as e:
        _raise_http(e)

@router.get("/vector/search")
def search_vector_runbooks(
    query: str = Query(default="fiber optical transceiver packet loss drop", description="Semantic query text"),
    top_k: int = Query(default=3, ge=1, le=10),
    principal: Principal = Depends(get_principal)
):
    try:
        _, context = _tenant_context(principal, None, Permission.TOPOLOGY_READ)
        from app.vector_store import get_vector_store
        vs = get_vector_store()
        results = vs.search_runbooks(query=query, top_k=top_k)
        return {
            "query": query,
            "results_count": len(results),
            "runbooks": results
        }
    except Exception as e:
        _raise_http(e)

@router.post("/graph/cypher")
def run_cypher_query(
    query: str = Query(default="MATCH (n) RETURN n LIMIT 10"),
    principal: Principal = Depends(get_principal)
):
    try:
        _, context = _tenant_context(principal, None, Permission.TOPOLOGY_READ)
        _require_cypher_read_only(query)
        from app.graph_db import get_graph_db
        gdb = get_graph_db()
        res = gdb.execute_cypher(query)
        return {
            "query": query,
            "results": res,
            "engine": gdb.get_status()["engine"]
        }
    except Exception as e:
        _raise_http(e)

# -------------------------------------------------------------
# TOPOLOGY ENGINE ENDPOINTS
# -------------------------------------------------------------
@router.get("/topology/neighborhood")
def get_topology_neighborhood(
    entity_id: str,
    as_of: Optional[str] = None,
    max_hops: int = Query(default=2, le=3),
    tenant_id: Optional[str] = None,
    principal: Principal = Depends(get_principal)
):
    try:
        tenant, context = _tenant_context(principal, tenant_id, Permission.TOPOLOGY_READ)
        as_of_dt = parser.isoparse(as_of) if as_of else datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
        with TenantContext(tenant):
            res = traversal_service.get_neighborhood(entity_id, as_of_dt, tenant, max_hops)
            return res.to_dict()
    except Exception as e:
        _raise_http(e)

@router.get("/topology/shared-dependencies")
def get_shared_dependencies(
    entity_ids: List[str] = Query(default=["CELL_001", "CELL_002", "CELL_003"]),
    as_of: Optional[str] = None,
    tenant_id: Optional[str] = None,
    principal: Principal = Depends(get_principal)
):
    try:
        tenant, context = _tenant_context(principal, tenant_id, Permission.TOPOLOGY_READ)
        as_of_dt = parser.isoparse(as_of) if as_of else datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
        with TenantContext(tenant):
            res = traversal_service.find_shared_dependencies(entity_ids, as_of_dt, tenant)
            return res
    except Exception as e:
        _raise_http(e)

# -------------------------------------------------------------
# KPI ENGINE ENDPOINTS
# -------------------------------------------------------------
@router.get("/kpi/entity")
def get_entity_kpis(
    entity_id: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    tenant_id: Optional[str] = None,
    principal: Principal = Depends(get_principal)
):
    try:
        tenant, context = _tenant_context(principal, tenant_id, Permission.KPI_READ)
        s_dt = parser.isoparse(start_time) if start_time else datetime(2026, 11, 10, 9, 30, 0, tzinfo=timezone.utc)
        e_dt = parser.isoparse(end_time) if end_time else datetime(2026, 11, 10, 10, 15, 0, tzinfo=timezone.utc)
        with TenantContext(tenant):
            records = kpi_service.get_entity_kpis(tenant, entity_id, s_dt, e_dt)
            return {
                "entity_id": entity_id,
                "tenant_id": tenant,
                "records": [r.model_dump() for r in records],
                "count": len(records)
            }
    except Exception as e:
        _raise_http(e)

@router.get("/kpi/verify-integrity")
def verify_integrity(
    entity_ids: List[str] = Query(default=["CELL_001", "CELL_002", "CELL_003", "CELL_099"]),
    tenant_id: Optional[str] = None,
    principal: Principal = Depends(get_principal)
):
    try:
        tenant, context = _tenant_context(principal, tenant_id, Permission.KPI_READ)
        s_dt = datetime(2026, 11, 10, 9, 30, 0, tzinfo=timezone.utc)
        e_dt = datetime(2026, 11, 10, 10, 15, 0, tzinfo=timezone.utc)
        with TenantContext(tenant):
            assessments = kpi_service.verify_evidence_integrity(tenant, entity_ids, s_dt, e_dt)
            return {eid: a.to_dict() for eid, a in assessments.items()}
    except Exception as e:
        _raise_http(e)

# -------------------------------------------------------------
# AUTONOMOUS AGENT INVESTIGATION ENDPOINTS
# -------------------------------------------------------------
@router.post("/investigation/run")
def run_investigation(req: InvestigationRequest, principal: Principal = Depends(get_principal)):
    try:
        tenant, context = _tenant_context(principal, req.tenant_id, Permission.ALARM_READ)
        with TenantContext(tenant):
            t = req.incident_time or datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
            report = orchestration_hub.run_alarm_investigation(
                tenant_id=tenant,
                affected_cells=req.affected_cells,
                incident_time=t
            )
            return report.model_dump()
    except Exception as e:
        _raise_http(e)

@router.get("/investigation/graph")
def get_investigation_graph():
    """
    Returns the compiled LangGraph state machine structure, nodes, edges,
    and Mermaid flowchart for the incident investigation workflow.
    """
    try:
        alarm_agent = orchestration_hub.alarm_agent
        workflow = alarm_agent.graph
        drawn = workflow.graph.get_graph()
        return {
            "orchestrator": "LangGraph (StateGraph)",
            "nodes": list(drawn.nodes.keys()) if hasattr(drawn.nodes, 'keys') else list(drawn.nodes),
            "edges": [{"source": e.source, "target": e.target} for e in drawn.edges],
            "mermaid": workflow.to_mermaid(),
            "state_schema": [
                "tenant_id", "affected_cells", "incident_time", "agent_id",
                "steps", "shared_entities", "kpi_observations", "quality_eval",
                "is_genuine", "has_uncertainty", "decision", "target_id",
                "kpi_summary", "root_cause_summary", "staged_action", "ai_engine",
                "failover_path"
            ]
        }
    except Exception as e:
        _raise_http(e)

@router.post("/change/simulate")
def simulate_change(req: ChangeSimulationRequest, principal: Principal = Depends(get_principal)):
    try:
        tenant, context = _tenant_context(principal, req.tenant_id, Permission.SIMULATE_CHANGE)
        with TenantContext(tenant):
            assessment = orchestration_hub.run_change_simulation(
                tenant_id=tenant,
                target_entity_id=req.target_entity_id,
                change_type=req.change_type
            )
            return assessment.model_dump()
    except Exception as e:
        _raise_http(e)

# -------------------------------------------------------------
# HUMAN-IN-THE-LOOP APPROVAL ENDPOINTS
# -------------------------------------------------------------
@router.get("/actions")
def list_actions(tenant_id: Optional[str] = None, principal: Principal = Depends(get_principal)):
    try:
        tenant, context = _tenant_context(principal, tenant_id, Permission.ALARM_READ)
        with TenantContext(tenant):
            actions = hitl_manager.list_actions(tenant)
            return [a.model_dump() for a in actions]
    except Exception as e:
        _raise_http(e)

@router.post("/actions/{action_id}/approve")
def approve_action(action_id: str, req: ActionApprovalRequest, principal: Principal = Depends(get_principal)):
    try:
        tenant = principal.authorize_tenant(req.tenant_id)
        with TenantContext(tenant):
            # Identity and role come from the authenticated principal, not the body.
            sec = principal.to_context(tenant)
            action = hitl_manager.approve_and_execute(action_id, sec, comment=req.comment)
            return action.model_dump()
    except Exception as e:
        _raise_http(e)

@router.post("/actions/{action_id}/reject")
def reject_action(action_id: str, req: ActionRejectionRequest, principal: Principal = Depends(get_principal)):
    try:
        tenant = principal.authorize_tenant(req.tenant_id)
        with TenantContext(tenant):
            # Identity and role come from the authenticated principal, not the body.
            sec = principal.to_context(tenant)
            action = hitl_manager.reject_action(action_id, sec, reason=req.reason)
            return action.model_dump()
    except Exception as e:
        _raise_http(e)

# -------------------------------------------------------------
# MODEL CONTEXT PROTOCOL (MCP) JSON-RPC 2.0 ENDPOINT
# -------------------------------------------------------------
@router.post("/mcp")
def handle_mcp_rpc(
    req: MCPRPCRequest,
    tenant_id: Optional[str] = None,
    principal: Principal = Depends(get_principal)
):
    try:
        tenant = principal.authorize_tenant(tenant_id)
        sec = principal.to_context(tenant)
        if req.method == "tools/list":
            return mcp_server.handle_tools_list(sec)
        elif req.method == "tools/call":
            params = req.params or {}
            name = params.get("name")
            args = params.get("arguments", {})
            return mcp_server.handle_tools_call(name, args, sec)
        else:
            return {
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": f"Method '{req.method}' not found."},
                "id": req.id
            }
    except Exception as e:
        if isinstance(e, HTTPException):
            return {
                "jsonrpc": "2.0",
                "error": {"code": e.status_code, "message": str(e.detail)},
                "id": req.id
            }
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32603, "message": str(e)},
            "id": req.id
        }

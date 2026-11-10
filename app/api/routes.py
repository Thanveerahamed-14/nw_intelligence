"""
FastAPI REST Routes and MCP Server Endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
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
from app.security.rbac import Role, Permission, SecurityContext
from app.security.tenancy import TenantContext, TenantIsolationViolationError

router = APIRouter()

# Globals initialized in main.py
graph = None
kpi_service = None
traversal_service = None
mcp_registry = None
mcp_server = None
orchestration_hub = None
hitl_manager = None

def init_services(g, kpi, trav, reg, srv, hub, hitl):
    global graph, kpi_service, traversal_service, mcp_registry, mcp_server, orchestration_hub, hitl_manager
    graph = g
    kpi_service = kpi
    traversal_service = trav
    mcp_registry = reg
    mcp_server = srv
    orchestration_hub = hub
    hitl_manager = hitl

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
def system_status():
    from app.ai import get_ai_service
    from app.vector_store import get_vector_store
    from app.graph_db import get_graph_db
    from app.config import settings

    ai = get_ai_service()
    vs = get_vector_store()
    gdb = get_graph_db()

    return {
        "ai": ai.get_status(),
        "vector_db": {
            "type": settings.VECTOR_DB_TYPE,
            "engine": "ChromaDB (Persistent Local Vector Store)",
            "persist_directory": settings.CHROMA_PERSIST_DIRECTORY,
            "indexed_runbooks_count": vs.collection.count(),
            "status": "ONLINE"
        },
        "graph_db": gdb.get_status(),
        "relational_db": {
            "url": settings.DATABASE_URL,
            "status": "ONLINE"
        },
        "multi_tenancy": {
            "tenants": settings.get_allowed_tenants(),
            "isolation": "STRICT_PER_CUSTOMER"
        }
    }

@router.get("/vector/search")
def search_vector_runbooks(
    query: str = Query(default="fiber optical transceiver packet loss drop", description="Semantic query text"),
    top_k: int = Query(default=3, ge=1, le=10)
):
    from app.vector_store import get_vector_store
    vs = get_vector_store()
    results = vs.search_runbooks(query=query, top_k=top_k)
    return {
        "query": query,
        "results_count": len(results),
        "runbooks": results
    }

@router.post("/graph/cypher")
def run_cypher_query(query: str = Query(default="MATCH (n) RETURN n LIMIT 10")):
    from app.graph_db import get_graph_db
    gdb = get_graph_db()
    res = gdb.execute_cypher(query)
    return {
        "query": query,
        "results": res,
        "engine": gdb.get_status()["engine"]
    }

# -------------------------------------------------------------
# TOPOLOGY ENGINE ENDPOINTS
# -------------------------------------------------------------
@router.get("/topology/neighborhood")
def get_topology_neighborhood(
    entity_id: str,
    as_of: Optional[str] = None,
    max_hops: int = Query(default=2, le=3),
    tenant_id: str = "customer_a",
    caller_role: str = "alarm_management"
):
    try:
        as_of_dt = parser.isoparse(as_of) if as_of else datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
        with TenantContext(tenant_id):
            res = traversal_service.get_neighborhood(entity_id, as_of_dt, tenant_id, max_hops)
            return res.to_dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/topology/shared-dependencies")
def get_shared_dependencies(
    entity_ids: List[str] = Query(default=["CELL_001", "CELL_002", "CELL_003"]),
    as_of: Optional[str] = None,
    tenant_id: str = "customer_a"
):
    try:
        as_of_dt = parser.isoparse(as_of) if as_of else datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
        with TenantContext(tenant_id):
            res = traversal_service.find_shared_dependencies(entity_ids, as_of_dt, tenant_id)
            return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------
# KPI ENGINE ENDPOINTS
# -------------------------------------------------------------
@router.get("/kpi/entity")
def get_entity_kpis(
    entity_id: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    tenant_id: str = "customer_a"
):
    try:
        s_dt = parser.isoparse(start_time) if start_time else datetime(2026, 11, 10, 9, 30, 0, tzinfo=timezone.utc)
        e_dt = parser.isoparse(end_time) if end_time else datetime(2026, 11, 10, 10, 15, 0, tzinfo=timezone.utc)
        with TenantContext(tenant_id):
            records = kpi_service.get_entity_kpis(tenant_id, entity_id, s_dt, e_dt)
            return {
                "entity_id": entity_id,
                "tenant_id": tenant_id,
                "records": [r.dict() for r in records],
                "count": len(records)
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/kpi/verify-integrity")
def verify_integrity(
    entity_ids: List[str] = Query(default=["CELL_001", "CELL_002", "CELL_003", "CELL_099"]),
    tenant_id: str = "customer_a"
):
    try:
        s_dt = datetime(2026, 11, 10, 9, 30, 0, tzinfo=timezone.utc)
        e_dt = datetime(2026, 11, 10, 10, 15, 0, tzinfo=timezone.utc)
        with TenantContext(tenant_id):
            assessments = kpi_service.verify_evidence_integrity(tenant_id, entity_ids, s_dt, e_dt)
            return {eid: a.to_dict() for eid, a in assessments.items()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------
# AUTONOMOUS AGENT INVESTIGATION ENDPOINTS
# -------------------------------------------------------------
@router.post("/investigation/run")
def run_investigation(req: InvestigationRequest):
    try:
        with TenantContext(req.tenant_id):
            t = req.incident_time or datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
            report = orchestration_hub.run_alarm_investigation(
                tenant_id=req.tenant_id,
                affected_cells=req.affected_cells,
                incident_time=t
            )
            return report.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/change/simulate")
def simulate_change(req: ChangeSimulationRequest):
    try:
        with TenantContext(req.tenant_id):
            assessment = orchestration_hub.run_change_simulation(
                tenant_id=req.tenant_id,
                target_entity_id=req.target_entity_id,
                change_type=req.change_type
            )
            return assessment.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# HUMAN-IN-THE-LOOP APPROVAL ENDPOINTS
# -------------------------------------------------------------
@router.get("/actions")
def list_actions(tenant_id: str = "customer_a"):
    with TenantContext(tenant_id):
        actions = hitl_manager.list_actions(tenant_id)
        return [a.dict() for a in actions]

@router.post("/actions/{action_id}/approve")
def approve_action(action_id: str, req: ActionApprovalRequest):
    try:
        with TenantContext(req.tenant_id):
            sec = SecurityContext(
                caller_id=req.caller_id,
                role=Role.HUMAN_OPERATOR,
                tenant_id=req.tenant_id
            )
            action = hitl_manager.approve_and_execute(action_id, sec, comment=req.comment)
            return action.dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/actions/{action_id}/reject")
def reject_action(action_id: str, req: ActionRejectionRequest):
    try:
        with TenantContext(req.tenant_id):
            sec = SecurityContext(
                caller_id=req.caller_id,
                role=Role.HUMAN_OPERATOR,
                tenant_id=req.tenant_id
            )
            action = hitl_manager.reject_action(action_id, sec, reason=req.reason)
            return action.dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------
# MODEL CONTEXT PROTOCOL (MCP) JSON-RPC 2.0 ENDPOINT
# -------------------------------------------------------------
@router.post("/mcp")
def handle_mcp_rpc(
    req: MCPRPCRequest,
    caller_id: str = "agent-mcp-client",
    role: str = "alarm_management",
    tenant_id: str = "customer_a"
):
    try:
        sec = SecurityContext(
            caller_id=caller_id,
            role=Role(role),
            tenant_id=tenant_id
        )
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
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32603, "message": str(e)},
            "id": req.id
        }


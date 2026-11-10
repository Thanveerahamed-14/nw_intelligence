"""
Main Application Entrypoint.
Initializes the FastAPI service, Model Context Protocol (MCP) server,
seeds multi-tenant topologies, and serves the interactive dashboard.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.topology_engine.graph import TemporalTopologyGraph
from app.topology_engine.traversal import TopologyTraversalService
from app.kpi_engine.quality import KPIService
from app.mcp.tools import MCPToolRegistry
from app.mcp.server import MCPServer
from app.agents.human_in_the_loop import get_hitl_manager
from app.agents.orchestrator import AgentOrchestrationHub
from app.api.routes import router as api_router, init_services
from data.seed_data import populate_sample_environment

# Global singletons
graph = TemporalTopologyGraph()
kpi_service = KPIService()
traversal_service = TopologyTraversalService(graph)
mcp_registry = MCPToolRegistry(traversal_service, kpi_service)
mcp_server = MCPServer(mcp_registry)
hitl_manager = get_hitl_manager()
orchestration_hub = AgentOrchestrationHub(mcp_registry)

# Seed realistic 10:05 UTC telecom environment
populate_sample_environment(graph, kpi_service)

# Wire dependencies into API routes
init_services(
    g=graph,
    kpi=kpi_service,
    trav=traversal_service,
    reg=mcp_registry,
    srv=mcp_server,
    hub=orchestration_hub,
    hitl=hitl_manager
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("🚀 Telecom Network Intelligence Platform initialized")
    print("   • Topology Engine: Bi-temporal graph loaded")
    print("   • KPI Engine: 15-min aggregation & watermarking active")
    print("   • MCP Server: Tools registered with role governance")
    print("   • Human-In-The-Loop: Remediation safety gate active")
    print("   • Interactive Dashboard: http://localhost:8000")
    print("=" * 60)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Telecom Network Intelligence Platform for Role-Based AI Agents",
    lifespan=lifespan
)

# Mount static web UI assets
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Mount API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def get_dashboard():
    index_path = os.path.join(static_dir, "index.html")
    return FileResponse(index_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=False)


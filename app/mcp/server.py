"""
Model Context Protocol (MCP) JSON-RPC Server.
Conforms to MCP standard protocol (tools/list, tools/call)
providing bounded, multi-tenant AI tool dispatching.
"""

from typing import Dict, Any, List
import time
from app.mcp.tools import MCPToolRegistry
from app.security.rbac import SecurityContext

class MCPServer:
    def __init__(self, registry: MCPToolRegistry):
        self.registry = registry

    def handle_tools_list(self, context: SecurityContext) -> Dict[str, Any]:
        """Lists only tools that the authenticated caller has permission to view/call."""
        visible_tools = []
        for name, tool_def in self.registry.tools.items():
            if context.has_permission(tool_def.required_permission):
                visible_tools.append({
                    "name": tool_def.name,
                    "description": tool_def.description,
                    "inputSchema": tool_def.parameters
                })
        return {
            "tools": visible_tools,
            "caller_role": context.role.value,
            "tenant_id": context.tenant_id
        }

    def handle_tools_call(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        context: SecurityContext
    ) -> Dict[str, Any]:
        """Executes tool call within security, tenant, and SLA boundaries."""
        start_time = time.perf_counter()
        
        try:
            result = self.registry.execute_tool(tool_name, arguments, context)
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            return {
                "jsonrpc": "2.0",
                "result": result.get("content", {}),
                "isError": result.get("isError", False),
                "error": result.get("error"),
                "meta": {
                    "duration_ms": round(duration_ms, 2),
                    "caller_id": context.caller_id,
                    "role": context.role.value,
                    "tenant_id": context.tenant_id
                }
            }
        except PermissionError as pe:
            return {
                "jsonrpc": "2.0",
                "isError": True,
                "error": {"code": 403, "message": str(pe)},
                "meta": {"duration_ms": round((time.perf_counter() - start_time) * 1000, 2)}
            }
        except Exception as ex:
            return {
                "jsonrpc": "2.0",
                "isError": True,
                "error": {"code": 500, "message": f"Tool execution failed: {str(ex)}"},
                "meta": {"duration_ms": round((time.perf_counter() - start_time) * 1000, 2)}
            }

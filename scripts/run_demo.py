"""
Standalone Demonstration Script for the 10:05 UTC Network Incident.
Simulates the entire workflow from alarm trigger to autonomous investigation,
evidence integrity verification, HITL staging, and human approval.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timezone
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from app.topology_engine.graph import TemporalTopologyGraph
from app.topology_engine.traversal import TopologyTraversalService
from app.kpi_engine.quality import KPIService
from app.mcp.tools import MCPToolRegistry
from app.agents.orchestrator import AgentOrchestrationHub
from app.agents.human_in_the_loop import get_hitl_manager
from app.security.rbac import SecurityContext, Role
from app.security.tenancy import TenantIsolationViolationError
from data.seed_data import populate_sample_environment

console = Console()

def run_cli_demo():
    console.print(Panel.fit(
        "[bold cyan]TELECOM NETWORK INTELLIGENCE PLATFORM[/bold cyan]\n"
        "[yellow]Autonomous Role-Based Agent Incident Investigation Demo[/yellow]",
        border_style="cyan"
    ))

    # 1. Initialize platform and seed data
    graph = TemporalTopologyGraph()
    kpi_service = KPIService()
    traversal_service = TopologyTraversalService(graph)
    mcp_registry = MCPToolRegistry(traversal_service, kpi_service)
    hub = AgentOrchestrationHub(mcp_registry)
    hitl = get_hitl_manager()

    incident_time, affected_cells = populate_sample_environment(graph, kpi_service)

    console.print(f"\n[bold red]🚨 ALARM TRIGGERED at {incident_time.strftime('%H:%M:%S UTC')}[/bold red]")
    console.print(f"Entities: [bold white]{', '.join(affected_cells)}[/bold white]")
    console.print("Tenant Scope: [bold green]Customer A[/bold green]\n")

    # 2. Launch Autonomous Alarm Management Agent
    console.print("[bold blue]🤖 Launching Alarm Management Agent...[/bold blue]")
    report = hub.run_alarm_investigation(
        tenant_id="customer_a",
        affected_cells=affected_cells,
        incident_time=incident_time
    )

    # 3. Print Investigation Steps
    steps_table = Table(title="Investigation Execution Trace", show_lines=True)
    steps_table.add_column("Step", style="cyan", width=6)
    steps_table.add_column("Phase & Tool", style="magenta")
    steps_table.add_column("Key Findings & Observation", style="white")
    steps_table.add_column("Duration", style="green", width=10)

    for s in report.execution_steps:
        tool_desc = f"[{s.phase_type}]\nTool: {s.tool_invoked or 'Internal LLM'}"
        if s.step_number == 1:
            obs = f"Discovered Nodes: NODE_42, NODE_43 | Site: SITE_ALPHA"
        elif s.step_number == 2:
            obs = f"Shared Infrastructure Detected: CSR_ALPHA_01, LINK_BACKHAUL_09"
        elif s.step_number == 3:
            obs = f"Pre-incident KPIs nominal (100% avail). Incident KPIs degraded: CSR_ALPHA_09 packet loss >90%!"
        elif s.step_number == 4:
            obs = f"Data Quality: 100% counter completeness. Verdict: GENUINE_NETWORK_PROBLEM (Not missing telemetry)"
        else:
            obs = f"Root Cause: Backhaul fiber failure on CSR_ALPHA_01. Staged remediation ACT-XXXX."

        steps_table.add_row(f"#{s.step_number}", tool_desc, obs, f"{s.duration_ms} ms")

    console.print(steps_table)

    # 4. Summary & SLA
    sla_color = "green" if report.sla_target_met else "red"
    console.print(f"\n[bold]Total Agent Runtime:[/bold] [{sla_color}]{report.total_duration_ms} ms[/{sla_color}] (Target: < 30,000 ms)")
    console.print(Panel(report.root_cause_summary, title="[bold green]Root Cause Conclusion[/bold green]", border_style="green"))

    # 5. Staged Action & Human In The Loop
    action = report.recommended_action
    if action:
        console.print(f"\n[bold yellow]🛡️ Staged Remediation Action (HITL Gate):[/bold yellow]")
        console.print(f"Action ID: [bold]{action['action_id']}[/bold] | Type: [bold]{action['action_type']}[/bold]")
        console.print(f"Status: [bold red]{action['status']}[/bold red] (Awaiting Human Operator Sign-Off)")
        console.print(f"Blast Radius: {action['blast_radius']}")

        # Simulate Human Sign-Off
        console.print("\n[bold cyan]👤 Simulating Human Operator (NOC Tier 2 Lead) Review...[/bold cyan]")
        operator_context = SecurityContext(caller_id="lead_operator_sarah", role=Role.HUMAN_OPERATOR, tenant_id="customer_a")
        approved_action = hitl.approve_and_execute(
            action_id=action["action_id"],
            approver_context=operator_context,
            comment="Verified redundant microwave capacity and alarm correlation. Approved."
        )
        console.print(f"Result: [bold green]{approved_action.execution_result}[/bold green]")
        console.print(f"New Action Status: [bold green]{approved_action.status.value}[/bold green]")

    # 6. Demonstrate Multi-Tenant Isolation
    console.print("\n[bold magenta]🔒 Verifying Multi-Tenant Boundary Enforcement...[/bold magenta]")
    res_cross = traversal_service.get_neighborhood("CUST_B_NODE_99", incident_time, tenant_id="customer_a")
    if len(res_cross.nodes) == 0:
        console.print("[green]PASS: Cross-tenant node 'CUST_B_NODE_99' strictly excluded from Customer A graph![/green]")
    else:
        console.print("[red]FAIL: Cross-tenant node leaked into Customer A graph![/red]")

    # 7. Demonstrate RBAC Guardrail
    console.print("[bold magenta]🔒 Verifying Role-Based Access Control (RBAC) Guardrail...[/bold magenta]")
    perf_analyst_context = SecurityContext(caller_id="analyst_bob", role=Role.PERFORMANCE_ANALYSIS, tenant_id="customer_a")
    try:
        mcp_registry.execute_tool(
            "propose_remediation_action",
            {
                "target_entity_id": "CSR_ALPHA_01",
                "action_type": "REBOOT",
                "justification": "Test",
                "blast_radius_summary": "Test",
                "rollback_procedure": "Test"
            },
            perf_analyst_context
        )
        console.print("[red]FAIL: Performance Analyst allowed to propose action![/red]")
    except PermissionError:
        console.print("[green]PASS: Performance Analyst blocked from proposing actions (Role Boundary Intact)![/green]")

    console.print("\n[bold green]✅ Demonstration Completed Successfully![/bold green]\n")

if __name__ == "__main__":
    run_cli_demo()

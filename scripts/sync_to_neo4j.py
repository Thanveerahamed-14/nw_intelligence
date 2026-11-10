"""
Neo4j Graph Database Synchronizer.
Seeds or syncs the multi-tenant telecom topology into a live Neo4j instance.
Connects using credentials configured in .env (NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD).
"""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rich.console import Console
from rich.panel import Panel
from app.config import settings

console = Console()

def sync_topology_to_neo4j():
    console.print(Panel.fit(
        "[bold cyan]NEO4J TELECOM TOPOLOGY SYNCHRONIZER[/bold cyan]\n"
        f"Target URI: [yellow]{settings.NEO4J_URI or 'bolt://localhost:7687'}[/yellow] | User: [yellow]{settings.NEO4J_USER}[/yellow]",
        border_style="cyan"
    ))

    if not settings.NEO4J_URI or not settings.NEO4J_PASSWORD:
        console.print("[red]❌ Error: NEO4J_URI or NEO4J_PASSWORD is not set in .env![/red]")
        console.print("\n[yellow]To connect your local Neo4j:[/yellow]")
        console.print("1. Open the [bold].env[/bold] file in the project root.")
        console.print("2. Set your credentials:")
        console.print("   [green]NEO4J_URI=bolt://localhost:7687[/green]")
        console.print("   [green]NEO4J_USER=neo4j[/green]")
        console.print("   [green]NEO4J_PASSWORD=your_actual_password[/green]")
        console.print("3. Re-run: [bold]python scripts/sync_to_neo4j.py[/bold]\n")
        return False

    try:
        import neo4j
        console.print("[cyan]Connecting to Neo4j instance...[/cyan]")
        driver = neo4j.GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        driver.verify_connectivity()
        console.print("[bold green]✓ Successfully connected to Neo4j![/bold green]")

        with driver.session(database=settings.NEO4J_DATABASE) as session:
            console.print("[cyan]Applying Cypher schema constraints & indexes...[/cyan]")
            # Constraints
            session.run("CREATE CONSTRAINT cell_id IF NOT EXISTS FOR (c:Cell) REQUIRE c.id IS UNIQUE")
            session.run("CREATE CONSTRAINT node_id IF NOT EXISTS FOR (n:RadioNode) REQUIRE n.id IS UNIQUE")
            session.run("CREATE CONSTRAINT router_id IF NOT EXISTS FOR (r:Router) REQUIRE r.id IS UNIQUE")
            session.run("CREATE CONSTRAINT site_id IF NOT EXISTS FOR (s:Site) REQUIRE s.id IS UNIQUE")

            console.print("[cyan]Populating customer_a network topology graph...[/cyan]")
            # Cypher batch script creating the entire incident topology
            cypher_seed = """
            // 1. Create Sites
            MERGE (s:Site {id: 'SITE_ALPHA', tenant_id: 'customer_a'})
            ON CREATE SET s.name = 'Downtown Tower Alpha', s.vendor = 'CrownCastle', s.power_backup = 'Active';

            // 2. Create Radio Nodes
            MERGE (n1:RadioNode {id: 'NODE_42', tenant_id: 'customer_a'})
            ON CREATE SET n1.name = 'gNodeB-42 (Ericsson)', n1.vendor = 'Ericsson', n1.du_type = 'Baseband 6630';

            MERGE (n2:RadioNode {id: 'NODE_43', tenant_id: 'customer_a'})
            ON CREATE SET n2.name = 'gNodeB-43 (Nokia)', n2.vendor = 'Nokia', n2.du_type = 'AirScale SM';

            // 3. Create Cells
            MERGE (c1:Cell {id: 'CELL_001', tenant_id: 'customer_a'})
            ON CREATE SET c1.name = 'Cell-001 (5G NR)', c1.vendor = 'Ericsson', c1.frequency_band = 'n78';

            MERGE (c2:Cell {id: 'CELL_002', tenant_id: 'customer_a'})
            ON CREATE SET c2.name = 'Cell-002 (5G NR)', c2.vendor = 'Ericsson', c2.frequency_band = 'n78';

            MERGE (c3:Cell {id: 'CELL_003', tenant_id: 'customer_a'})
            ON CREATE SET c3.name = 'Cell-003 (4G LTE)', c3.vendor = 'Nokia', c3.frequency_band = 'B3';

            // 4. Create Cell Site Router
            MERGE (r:Router {id: 'CSR_ALPHA_01', tenant_id: 'customer_a'})
            ON CREATE SET r.name = 'Cell Site Router Alpha-01', r.vendor = 'Cisco', r.model = 'ASR-903';

            // 5. Create Transport Links
            MERGE (l1:TransportLink {id: 'LINK_BACKHAUL_09', tenant_id: 'customer_a'})
            ON CREATE SET l1.name = 'Primary 10GE Fiber Link', l1.status = 'ACTIVE_FAILING', l1.medium = 'Fiber';

            MERGE (l2:TransportLink {id: 'LINK_BACKHAUL_STANDBY_09', tenant_id: 'customer_a'})
            ON CREATE SET l2.name = 'Standby Microwave Link', l2.status = 'STANDBY_PROTECTION', l2.medium = 'Microwave';

            // 6. Create Aggregation Core Router
            MERGE (agg:Router {id: 'AGG_ROUTER_01', tenant_id: 'customer_a'})
            ON CREATE SET agg.name = 'Central Aggregation Router', agg.vendor = 'Juniper';

            // 7. Relationships
            MERGE (c1)-[:HOSTED_ON]->(n1)
            MERGE (c2)-[:HOSTED_ON]->(n1)
            MERGE (c3)-[:HOSTED_ON]->(n2)
            MERGE (n1)-[:HOSTED_ON]->(s)
            MERGE (n2)-[:HOSTED_ON]->(s)
            MERGE (n1)-[:CONNECTS_TO]->(r)
            MERGE (n2)-[:CONNECTS_TO]->(r)
            MERGE (r)-[:CONNECTS_TO]->(l1)
            MERGE (r)-[:CONNECTS_TO]->(l2)
            MERGE (l1)-[:TERMINATES_ON]->(agg)
            MERGE (l2)-[:TERMINATES_ON]->(agg);
            """
            session.run(cypher_seed)

            # Query count
            res = session.run("MATCH (n {tenant_id: 'customer_a'}) RETURN count(n) AS node_count")
            count = res.single()["node_count"]
            console.print(f"[bold green]✓ Successfully synced {count} network entities into Neo4j database '{settings.NEO4J_DATABASE}'![/bold green]")
            console.print("[cyan]You can now open Neo4j Browser at [underline]http://localhost:7474[/underline] and run:[/cyan]")
            console.print("[white]   MATCH p=(c:Cell)-[*1..3]->(t) RETURN p LIMIT 25[/white]\n")

        driver.close()
        return True
    except Exception as e:
        console.print(f"[bold red]❌ Failed to connect to Neo4j:[/bold red] {e}")
        console.print("[yellow]Ensure Neo4j service is running and the password in .env is correct.[/yellow]")
        return False

if __name__ == "__main__":
    sync_topology_to_neo4j()

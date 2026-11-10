"""
Comprehensive Seed Data Generator.
Populates realistic multi-tenant topology and telemetry simulating the exact 10:05 UTC incident:
- Customer A (primary tenant): Site Alpha with 2 nodes, 3 degraded cells, 1 shared CSR, and 2 backhaul links
- Customer B: Separate isolated topology to demonstrate strict multi-tenant boundary
- Performance counters across 09:30-10:15 UTC with normal state, backhaul degradation, and control cells
"""

from datetime import datetime, timezone, timedelta
from typing import Tuple

from app.topology_engine.models import NetworkEntity, NetworkRelationship, EntityType, RelationshipType
from app.topology_engine.graph import TemporalTopologyGraph
from app.kpi_engine.quality import KPIService
from app.connection_factory.provenance import compute_payload_hash

def populate_sample_environment(
    graph: TemporalTopologyGraph,
    kpi_service: KPIService
) -> Tuple[datetime, list[str]]:
    incident_time = datetime(2026, 11, 10, 10, 5, 0, tzinfo=timezone.utc)
    base_valid_time = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    
    # =========================================================================
    # 1. TENANT A TOPOLOGY SEEDING (Customer A)
    # =========================================================================
    tenant_a = "customer_a"

    # Entities
    site_alpha = NetworkEntity(
        id="SITE_ALPHA",
        tenant_id=tenant_a,
        name="Downtown Central Tower Alpha",
        entity_type=EntityType.SITE,
        vendor="CrownCastle",
        properties={"latitude": 51.5074, "longitude": -0.1278, "city": "London", "power_backup": "Generator_Active"},
        valid_from=base_valid_time
    )

    node_42 = NetworkEntity(
        id="NODE_42",
        tenant_id=tenant_a,
        name="gNodeB-42 (Ericsson NR)",
        entity_type=EntityType.RADIO_NODE,
        vendor="Ericsson",
        properties={"software_version": "CXI_101_56", "du_type": "Baseband 6630", "ip_address": "10.200.42.1"},
        valid_from=base_valid_time
    )

    node_43 = NetworkEntity(
        id="NODE_43",
        tenant_id=tenant_a,
        name="gNodeB-43 (Nokia AirScale)",
        entity_type=EntityType.RADIO_NODE,
        vendor="Nokia",
        properties={"software_version": "ASIK_24R2", "du_type": "AirScale SM", "ip_address": "10.200.43.1"},
        valid_from=base_valid_time
    )

    cell_001 = NetworkEntity(
        id="CELL_001",
        tenant_id=tenant_a,
        name="Cell-001 (5G NR 3.5GHz Sector 1)",
        entity_type=EntityType.CELL,
        vendor="Ericsson",
        properties={"frequency_band": "n78", "carrier_bandwidth_mhz": 100, "azimuth": 0, "pci": 101},
        valid_from=base_valid_time
    )

    cell_002 = NetworkEntity(
        id="CELL_002",
        tenant_id=tenant_a,
        name="Cell-002 (5G NR 3.5GHz Sector 2)",
        entity_type=EntityType.CELL,
        vendor="Ericsson",
        properties={"frequency_band": "n78", "carrier_bandwidth_mhz": 100, "azimuth": 120, "pci": 102},
        valid_from=base_valid_time
    )

    cell_003 = NetworkEntity(
        id="CELL_003",
        tenant_id=tenant_a,
        name="Cell-003 (4G LTE 1800MHz Sector 1)",
        entity_type=EntityType.CELL,
        vendor="Nokia",
        properties={"frequency_band": "B3", "carrier_bandwidth_mhz": 20, "azimuth": 240, "pci": 201},
        valid_from=base_valid_time
    )

    csr_alpha = NetworkEntity(
        id="CSR_ALPHA_01",
        tenant_id=tenant_a,
        name="Cell Site Router Alpha-01",
        entity_type=EntityType.ROUTER,
        vendor="Cisco",
        properties={"model": "ASR-903", "ios_version": "17.9.3", "ip_address": "10.200.1.1", "role": "IP_RAN_CSR"},
        valid_from=base_valid_time
    )

    link_primary = NetworkEntity(
        id="LINK_BACKHAUL_09",
        tenant_id=tenant_a,
        name="Primary Fiber Backhaul 10G-09",
        entity_type=EntityType.TRANSPORT_LINK,
        vendor="Cisco",
        properties={"medium": "SingleMode_Fiber", "capacity_gbps": 10.0, "status": "ACTIVE_PRIMARY"},
        valid_from=base_valid_time
    )

    link_standby = NetworkEntity(
        id="LINK_BACKHAUL_STANDBY_09",
        tenant_id=tenant_a,
        name="Standby Microwave Backhaul 1G-09",
        entity_type=EntityType.TRANSPORT_LINK,
        vendor="SIAE",
        properties={"medium": "Microwave_80GHz", "capacity_gbps": 1.0, "status": "STANDBY_PROTECTION"},
        valid_from=base_valid_time
    )

    agg_router = NetworkEntity(
        id="AGG_ROUTER_01",
        tenant_id=tenant_a,
        name="Central Aggregation Router 01",
        entity_type=EntityType.ROUTER,
        vendor="Juniper",
        properties={"model": "MX960", "role": "CORE_AGGREGATION"},
        valid_from=base_valid_time
    )

    # Control Cell (Site Beta) to demonstrate missing telemetry / uncertainty
    site_beta = NetworkEntity(
        id="SITE_BETA",
        tenant_id=tenant_a,
        name="Suburban Tower Beta",
        entity_type=EntityType.SITE,
        vendor="CrownCastle",
        properties={"latitude": 51.5200, "longitude": -0.1400},
        valid_from=base_valid_time
    )

    cell_099 = NetworkEntity(
        id="CELL_099",
        tenant_id=tenant_a,
        name="Cell-099 (Control Cell with Missing Telemetry)",
        entity_type=EntityType.CELL,
        vendor="Ericsson",
        properties={"frequency_band": "B7", "pci": 399},
        valid_from=base_valid_time
    )

    # Insert Tenant A Entities
    for e in [site_alpha, node_42, node_43, cell_001, cell_002, cell_003, csr_alpha, link_primary, link_standby, agg_router, site_beta, cell_099]:
        graph.upsert_entity(e)

    # Relationships
    rels = [
        # Cells hosted on radio nodes
        NetworkRelationship(id="R1", tenant_id=tenant_a, source_id="CELL_001", target_id="NODE_42", rel_type=RelationshipType.HOSTED_ON, valid_from=base_valid_time),
        NetworkRelationship(id="R2", tenant_id=tenant_a, source_id="CELL_002", target_id="NODE_42", rel_type=RelationshipType.HOSTED_ON, valid_from=base_valid_time),
        NetworkRelationship(id="R3", tenant_id=tenant_a, source_id="CELL_003", target_id="NODE_43", rel_type=RelationshipType.HOSTED_ON, valid_from=base_valid_time),
        NetworkRelationship(id="R_CTRL", tenant_id=tenant_a, source_id="CELL_099", target_id="SITE_BETA", rel_type=RelationshipType.HOSTED_ON, valid_from=base_valid_time),
        
        # Radio nodes hosted at site
        NetworkRelationship(id="R4", tenant_id=tenant_a, source_id="NODE_42", target_id="SITE_ALPHA", rel_type=RelationshipType.HOSTED_ON, valid_from=base_valid_time),
        NetworkRelationship(id="R5", tenant_id=tenant_a, source_id="NODE_43", target_id="SITE_ALPHA", rel_type=RelationshipType.HOSTED_ON, valid_from=base_valid_time),
        
        # Radio nodes connected to CSR
        NetworkRelationship(id="R6", tenant_id=tenant_a, source_id="NODE_42", target_id="CSR_ALPHA_01", rel_type=RelationshipType.CONNECTS_TO, valid_from=base_valid_time),
        NetworkRelationship(id="R7", tenant_id=tenant_a, source_id="NODE_43", target_id="CSR_ALPHA_01", rel_type=RelationshipType.CONNECTS_TO, valid_from=base_valid_time),
        
        # CSR connected to transport links
        NetworkRelationship(id="R8", tenant_id=tenant_a, source_id="CSR_ALPHA_01", target_id="LINK_BACKHAUL_09", rel_type=RelationshipType.CONNECTS_TO, valid_from=base_valid_time),
        NetworkRelationship(id="R9", tenant_id=tenant_a, source_id="CSR_ALPHA_01", target_id="LINK_BACKHAUL_STANDBY_09", rel_type=RelationshipType.CONNECTS_TO, valid_from=base_valid_time),
        
        # Links terminate on Aggregation Router
        NetworkRelationship(id="R10", tenant_id=tenant_a, source_id="LINK_BACKHAUL_09", target_id="AGG_ROUTER_01", rel_type=RelationshipType.CONNECTS_TO, valid_from=base_valid_time),
        NetworkRelationship(id="R11", tenant_id=tenant_a, source_id="LINK_BACKHAUL_STANDBY_09", target_id="AGG_ROUTER_01", rel_type=RelationshipType.CONNECTS_TO, valid_from=base_valid_time)
    ]

    for r in rels:
        graph.upsert_relationship(r)

    # =========================================================================
    # 2. TENANT B ISOLATION SEEDING (Customer B)
    # =========================================================================
    tenant_b = "customer_b"
    cust_b_node = NetworkEntity(
        id="CUST_B_NODE_99",
        tenant_id=tenant_b,
        name="Customer B Private gNodeB",
        entity_type=EntityType.RADIO_NODE,
        vendor="Huawei",
        valid_from=base_valid_time
    )
    graph.upsert_entity(cust_b_node)

    # =========================================================================
    # 3. PERFORMANCE COUNTER TELEMETRY SEEDING
    # =========================================================================
    # Window 1: 09:30 - 09:45 (Nominal)
    # Window 2: 09:45 - 10:00 (Nominal pre-incident)
    # Window 3: 10:00 - 10:15 (Incident window, alarm triggered at 10:05 UTC)
    t_w1 = datetime(2026, 11, 10, 9, 30, 0, tzinfo=timezone.utc)
    t_w2 = datetime(2026, 11, 10, 9, 45, 0, tzinfo=timezone.utc)
    t_w3 = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)

    # Ingest 3 5-min samples for each window
    for w_time in [t_w1, t_w2]:
        for sample_offset in [0, 5, 10]:
            ts = w_time + timedelta(minutes=sample_offset)
            # Cells nominal
            for cid in ["CELL_001", "CELL_002", "CELL_003"]:
                kpi_service.ingest_counters(
                    tenant_id=tenant_a,
                    entity_id=cid,
                    timestamp=ts,
                    counters={
                        "cell_downtime_seconds": 0.0,
                        "rrc_connection_attempts": 3200.0,
                        "rrc_connection_successes": 3195.0,
                        "erab_abnormal_drops": 2.0,
                        "erab_normal_releases": 2500.0,
                        "prb_used_dl": 45.0,
                        "prb_available_dl": 100.0
                    },
                    provenance_hash=compute_payload_hash({"entity": cid, "ts": ts.isoformat()})
                )
            # Transport router & link nominal
            kpi_service.ingest_counters(
                tenant_id=tenant_a,
                entity_id="CSR_ALPHA_01",
                timestamp=ts,
                counters={"packet_discards_out": 2.0, "octets_out": 50_000_000.0},
                provenance_hash=compute_payload_hash({"entity": "CSR_ALPHA_01", "ts": ts.isoformat()})
            )
            kpi_service.ingest_counters(
                tenant_id=tenant_a,
                entity_id="LINK_BACKHAUL_09",
                timestamp=ts,
                counters={"packet_discards_out": 1.0, "octets_out": 50_000_000.0},
                provenance_hash=compute_payload_hash({"entity": "LINK_BACKHAUL_09", "ts": ts.isoformat()})
            )

    # Window 3 (Incident at 10:03-10:05 UTC)
    # Samples at 10:00 (nominal), 10:05 (catastrophic failure), 10:10 (outage persisting)
    for sample_offset, is_outage in [(0, False), (5, True), (10, True)]:
        ts = t_w3 + timedelta(minutes=sample_offset)
        
        # Transport Router & Link failure
        discards = 25_000_000.0 if is_outage else 5.0
        kpi_service.ingest_counters(
            tenant_id=tenant_a,
            entity_id="LINK_BACKHAUL_09",
            timestamp=ts,
            counters={"packet_discards_out": discards, "octets_out": 10_000_000.0 if is_outage else 50_000_000.0},
            provenance_hash=compute_payload_hash({"entity": "LINK_BACKHAUL_09", "ts": ts.isoformat()})
        )
        kpi_service.ingest_counters(
            tenant_id=tenant_a,
            entity_id="CSR_ALPHA_01",
            timestamp=ts,
            counters={"packet_discards_out": discards, "octets_out": 10_000_000.0 if is_outage else 50_000_000.0},
            provenance_hash=compute_payload_hash({"entity": "CSR_ALPHA_01", "ts": ts.isoformat()})
        )

        # Cells down
        downtime = 300.0 if is_outage else 0.0
        rrc_succ = 0.0 if is_outage else 3190.0
        drops = 1500.0 if is_outage else 2.0
        
        for cid in ["CELL_001", "CELL_002", "CELL_003"]:
            kpi_service.ingest_counters(
                tenant_id=tenant_a,
                entity_id=cid,
                timestamp=ts,
                counters={
                    "cell_downtime_seconds": downtime,
                    "rrc_connection_attempts": 3200.0,
                    "rrc_connection_successes": rrc_succ,
                    "erab_abnormal_drops": drops,
                    "erab_normal_releases": 10.0 if is_outage else 2500.0,
                    "prb_used_dl": 2.0 if is_outage else 45.0,
                    "prb_available_dl": 100.0
                },
                provenance_hash=compute_payload_hash({"entity": cid, "ts": ts.isoformat()})
            )

    # Control Cell (CELL_099) gets ONLY 1 sample out of 3 (simulates telemetry loss!)
    kpi_service.ingest_counters(
        tenant_id=tenant_a,
        entity_id="CELL_099",
        timestamp=t_w3,
        counters={"cell_downtime_seconds": 150.0, "rrc_connection_attempts": 500.0, "rrc_connection_successes": 100.0},
        provenance_hash=compute_payload_hash({"entity": "CELL_099", "ts": t_w3.isoformat()})
    )

    return incident_time, ["CELL_001", "CELL_002", "CELL_003"]

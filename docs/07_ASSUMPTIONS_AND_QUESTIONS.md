# 07. Working Assumptions, Challenges & Open Questions

## 1. Challenges to Initial Assumptions

### A. Strict Data Isolation vs. Shared Infrastructure (MOCN / TowerCo)
- **Assumption Stated**: *"Five customers with strict data isolation."*
- **Engineering Challenge**: In real-world telecom networks, multiple operators frequently share physical infrastructure through:
  1. **MOCN (Multi-Operator Core Network)**: Multiple operators sharing the same physical radio nodes and antennas, differentiated only by PLMN ID.
  2. **Passive Tower Sharing (TowerCos)**: Operators leasing antenna space on the same physical tower (e.g. Crown Castle / American Tower) with shared diesel generators, battery banks, and fiber conduits.
- **Platform Architecture Decision**: Our tenant isolation model strictly prevents Customer A from querying Customer B's subscriber or traffic metrics. However, our topology engine supports an underlying **Shared Facility Layer** where anonymized physical events (e.g. "Site Alpha commercial power failure") can correlate across tenants without leaking confidential customer traffic data.

### B. 50 Million Counter Rows/Day & 15-Minute Bursts
- **Assumption Stated**: *"Approximately 50 million performance-counter rows per day, arriving in bursts around 15-minute reporting intervals."*
- **Engineering Analysis**:
  - 50 million rows/day equates to an average of **~578 rows/second**.
  - However, in telecommunications, counters do not arrive uniformly. They arrive in synchronized bursts during the 3 minutes immediately following the 15-minute window close ($:00, :15, :30, :45$).
  - Peak burst volume will surge to **10,000 to 25,000 rows/second**.
- **Architecture Decision**: Direct OLTP database insertion (Cloud SQL) during bursts would cause IOPS exhaustion and lock contention. We route all counter bursts through **Cloud Pub/Sub** into **Google BigQuery Storage Write API** with managed streaming buffers, decoupling ingestion from analytical queries.

### C. 2-Hour Late Performance Data
- **Assumption Stated**: *"Performance data can arrive up to two hours late."*
- **Engineering Decision**:
  - We maintain a **Sliding Watermark of 2 hours 15 minutes**.
  - Any data arriving within the watermark triggers an **incremental delta recalculation**, updates the completeness score, and increments the record revision.
  - Data arriving after 2 hours 15 minutes is routed to an **Historical Backfill Pipeline** executed via nightly BigQuery scheduled queries to prevent destabilizing real-time agent caches.

---

## 2. Unresolved Questions for the Chief Solution Lead & Stakeholders

1. **Human-In-The-Loop (HITL) Expiration & SLA**:
   - If an agent stages an emergency reroute action in `PENDING_APPROVAL` and the NOC Human Operator does not respond within 15 minutes, should the action expire, escalate to a secondary on-call engineer, or (for pre-certified non-destructive changes) auto-execute under an emergency failover policy?

2. **2-Hop Topology Boundary Semantics**:
   - In 5G networks, does a "2-hop" lookup encompass logical service slices (e.g. Cell $\rightarrow$ gNodeB $\rightarrow$ UPF) or physical transport hops (Cell $\rightarrow$ gNodeB $\rightarrow$ CSR $\rightarrow$ Aggregation Router)? Our engine currently defaults to physical and logical adjacency up to a configurable depth of 3.

3. **Vendor Protocol Ingestion Constraints**:
   - Are legacy vendor EMS instances capable of streaming via modern telemetry (gRPC / Kafka / Pub/Sub), or will the platform require batch SFTP polling workers for legacy 3GPP XML / ASN.1 binary files?

4. **Closed-Loop Action Execution Endpoint**:
   - How does the platform authenticate against the physical network controllers (e.g. Cisco NSO, Nokia NSP, Ericsson ENM CLI/NETCONF) when a human approves an action? We recommend using short-lived signed JWTs passed to a hardened Network Configuration Gateway.


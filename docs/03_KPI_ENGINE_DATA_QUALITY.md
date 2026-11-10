# 03. KPI Engine & Data Quality Specification

## 1. 15-Minute Reporting Windows & Aggregation Mechanics

Telecommunication networks generate performance counters aligned to standard **15-minute 3GPP measurement periods** (e.g. 10:00–10:15 UTC). Raw telemetry counters are received at finer 1-minute or 5-minute sub-intervals.

The KPI Engine performs tumbling window aggregations with:
1. **Division-by-zero protection**: Guarding against empty traffic windows where connection attempts equal zero.
2. **Formula Registry & Versioning**: Every computed metric logs its formula version (e.g. `v1.2`) to support non-breaking formula updates.
3. **Audit Provenance**: Every KPI links to the exact set of raw counter hashes that produced it.

---

## 2. Core 3GPP & Transport KPI Formulas

| KPI Name | Formula | Unit | Required Raw Counters |
| :--- | :--- | :---: | :--- |
| **CELL_AVAILABILITY** | `100 * (1 - (cell_downtime_seconds / 900))` | `%` | `cell_downtime_seconds` |
| **RADIO_DROP_RATE** | `100 * (erab_drops / (erab_drops + erab_releases))` | `%` | `erab_abnormal_drops`, `erab_normal_releases` |
| **PRB_UTILIZATION_DL** | `100 * (prb_used_dl / prb_available_dl)` | `%` | `prb_used_dl`, `prb_available_dl` |
| **RRC_SETUP_SUCCESS** | `100 * (rrc_succ / rrc_attempts)` | `%` | `rrc_connection_attempts`, `rrc_connection_successes` |
| **TRANSPORT_PACKET_LOSS** | `100 * (discards / (packets_est + discards))` | `%` | `packet_discards_out`, `octets_out` |

---

## 3. Late-Arriving Data & Incremental Recalculation

Performance counters may arrive up to **2 hours late** due to transport buffering, backhaul congestion, or vendor EMS collector delays.

```mermaid
sequenceDiagram
    autonumber
    actor VendorEMS as Vendor EMS (Ericsson/Nokia)
    participant PubSub as Pub/Sub (Counters)
    participant KPIEngine as KPI Calculation Engine
    participant Store as BigQuery / KPI Store
    actor Agent as Alarm Management Agent

    VendorEMS->>PubSub: Batch 1 (Sample 1 & 2 at 10:10 UTC)
    PubSub->>KPIEngine: Process 10:00-10:15 Window
    KPIEngine->>Store: Publish KPIRecord (Rev 1, Status: PARTIAL, Completeness: 0.67)
    
    Agent->>Store: Query 10:00-10:15 KPIs (Sees Rev 1, Flags Uncertainty)
    
    Note over VendorEMS,PubSub: Late Counter Delay (25 minutes)
    VendorEMS->>PubSub: Batch 2 (Sample 3 arrives at 10:35 UTC)
    PubSub->>KPIEngine: Incremental Recalculation Triggered
    KPIEngine->>Store: Upsert KPIRecord (Rev 2, is_recalculated: true, Status: COMPLETE, Completeness: 1.0)
```

### Watermark Specification
- **Window Close Time**: $T_W + 15\text{ minutes}$
- **Sliding Watermark Grace Period**: $T_W + 135\text{ minutes}$ (2 hours 15 minutes)
- When a counter sample arrives with timestamp $T \le \text{Watermark}$, the engine performs an **incremental upsert**:
  1. Merges new counters into existing window sums.
  2. Increments `sample_count` and updates `completeness_score`.
  3. Increments record `revision` (e.g. $1 \rightarrow 2$).
  4. Sets `is_recalculated = true`.

---

## 4. Evidence Integrity: Outage vs. Missing Data

A primary risk in autonomous operations is an AI agent mistaking **missing telemetry for a catastrophic network crash** (or vice versa).

```mermaid
flowchart TD
    KPIQuery["KPI Engine Evaluates Entity"] --> CheckSamples{"Received Samples / Expected Samples"}
    
    CheckSamples -- "0% (0 / 3)" --> StatusNoData["Status: NO_DATA<br/>Completeness: 0.0"]
    CheckSamples -- "< 80% (1 / 3)" --> StatusIncomplete["Status: INCOMPLETE<br/>Completeness: 0.33"]
    CheckSamples -- ">= 80% (2 / 3)" --> StatusPartial["Status: PARTIAL_ESTIMATED<br/>Completeness: 0.67"]
    CheckSamples -- "100% (3 / 3)" --> StatusComplete["Status: COMPLETE<br/>Completeness: 1.0"]
    
    StatusNoData --> UncertaintyVerdict["Verdict: DATA_GAP_OR_UNCERTAINTY<br/>Action: Decline Remediation. Alert Ingestion Team."]
    StatusIncomplete --> UncertaintyVerdict
    
    StatusComplete --> ValueCheck{"KPIs Below SLA Threshold?"}
    StatusPartial --> ValueCheck
    
    ValueCheck -- Yes --> GenuineVerdict["Verdict: GENUINE_NETWORK_PROBLEM<br/>High Confidence Outage Confirmed.<br/>Action: Permit Remediation Proposal."]
    ValueCheck -- No --> NominalVerdict["Verdict: NOMINAL_PERFORMANCE<br/>Network operating within baseline."]
```

### Governance Rule for AI Agents
- **Rule 1 (Confidence Threshold)**: Autonomous agents are strictly prohibited from proposing remediation actions if entity `completeness_score < 0.80` or if `quality_status == INCOMPLETE`.
- **Rule 2 (Distinguishing Case)**: In our 10:05 UTC incident:
  - `CELL_001`, `CELL_002`, `CELL_003` report **100% counter completeness** $\rightarrow$ Confirmed **Genuine Network Problem**.
  - Control cell `CELL_099` reports **33% counter completeness** $\rightarrow$ Confirmed **Telemetry Gap / Uncertainty**. Agent halts and declines network reroute.


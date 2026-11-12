import React from 'react';
import { Activity, Server, Database, CheckCircle2, AlertOctagon, TrendingDown } from 'lucide-react';

/**
 * Incident metric strip. Every value is derived from telemetry/agent output --
 * nothing here is a presentation constant.
 */
export default function KpiMetricsRow({
  availability = null,
  packetLoss = null,
  affectedCells = 0,
  telemetry = null,
  latencyMs = null
}) {
  const pct = (value) => (value == null || Number.isNaN(value) ? 'n/a' : `${Number(value).toFixed(2)}%`);

  const availabilityState = availability == null
    ? 'info'
    : availability < 90 ? 'critical' : 'healthy';
  const lossState = packetLoss == null
    ? 'info'
    : packetLoss > 5 ? 'warning' : 'healthy';

  const metrics = [
    {
      label: 'Cell availability',
      value: pct(availability),
      note: '90% operating threshold',
      state: availabilityState,
      detail: affectedCells > 0
        ? `${affectedCells} cell(s) in incident scope`
        : 'No degraded cells in scope',
      Icon: Activity
    },
    {
      label: 'Backhaul packet loss',
      value: pct(packetLoss),
      note: '5% operating threshold',
      state: lossState,
      detail: packetLoss == null
        ? 'No transport samples'
        : 'Measured on shared transport',
      Icon: TrendingDown
    },
    {
      label: 'Telemetry integrity',
      value: telemetry?.value ?? 'n/a',
      note: telemetry?.note ?? 'awaiting investigation',
      state: telemetry?.state ?? 'info',
      detail: telemetry?.detail ?? 'Run the agent to verify evidence',
      Icon: Database
    },
    {
      label: 'Topology query',
      value: latencyMs == null ? 'n/a' : `${latencyMs} ms`,
      note: 'Target < 2,000 ms',
      state: 'info',
      detail: latencyMs != null && latencyMs < 2000
        ? 'p95 SLA compliant'
        : latencyMs == null ? 'No query measured' : 'p95 SLA exceeded',
      Icon: Server
    }
  ];

  return (
    <section className="metric-grid" aria-label="Incident metrics">
      {metrics.map(({ label, value, note, state, detail, Icon }) => (
        <article className={`metric-card metric-${state}`} key={label}>
          <div className="metric-topline">
            <span>{label}</span>
            <Icon aria-hidden="true" />
          </div>
          <div className="metric-reading">
            <strong>{value}</strong>
            <span>{note}</span>
          </div>
          <div className="metric-detail">
            {state === 'healthy' || state === 'info' ? <CheckCircle2 aria-hidden="true" /> : <AlertOctagon aria-hidden="true" />}
            {detail}
          </div>
        </article>
      ))}
    </section>
  );
}

import React from 'react';
import { Activity, Server, Database, CheckCircle2, AlertOctagon, TrendingDown } from 'lucide-react';

export default function KpiMetricsRow({ latencyMs, report }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      {/* Metric 1: Radio Availability */}
      <div className="clean-card p-4 border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Cell Availability (10:05 UTC)
          </span>
          <Activity className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-rose-400">0.0%</span>
          <span className="text-xs text-slate-500 line-through">100.0% baseline</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 w-fit font-medium">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Major Service Outage (3 Cells)</span>
        </div>
      </div>

      {/* Metric 2: Transport Backhaul Packet Loss */}
      <div className="clean-card p-4 border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            CSR-01 Backhaul Loss
          </span>
          <TrendingDown className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-amber-400">94.2%</span>
          <span className="text-xs text-slate-400">spiked at 10:03 UTC</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit font-medium">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Fiber Interface Discards</span>
        </div>
      </div>

      {/* Metric 3: Evidence Completeness */}
      <div className="clean-card p-4 border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Telemetry Completeness
          </span>
          <Database className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-emerald-400">100.0%</span>
          <span className="text-xs text-slate-400">(3 / 3 Samples)</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verified Physical Outage</span>
        </div>
      </div>

      {/* Metric 4: Topology Traversal SLA */}
      <div className="clean-card p-4 border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            2-Hop Traversal Latency
          </span>
          <Server className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-blue-400">{latencyMs || 0.85} ms</span>
          <span className="text-xs text-slate-400">Target &lt; 2,000 ms</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>p95 SLA Compliant</span>
        </div>
      </div>
    </div>
  );
}

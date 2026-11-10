import React from 'react';
import { Activity, Server, Database, CheckCircle2, AlertOctagon, TrendingDown } from 'lucide-react';

export default function KpiMetricsRow({ latencyMs, report }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      {/* Metric 1: Radio Availability */}
      <div className="clean-card p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Cell Availability (10:05 UTC)
          </span>
          <Activity className="w-4 h-4 text-red-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-red-600">0.0%</span>
          <span className="text-xs text-slate-400 line-through">100.0% baseline</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 w-fit font-semibold">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Major Service Outage (3 Cells)</span>
        </div>
      </div>

      {/* Metric 2: Transport Backhaul Packet Loss */}
      <div className="clean-card p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            CSR-01 Backhaul Loss
          </span>
          <TrendingDown className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-amber-600">94.2%</span>
          <span className="text-xs text-slate-500 font-medium">spiked at 10:03 UTC</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 w-fit font-semibold">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Fiber Interface Discards</span>
        </div>
      </div>

      {/* Metric 3: Evidence Completeness */}
      <div className="clean-card p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Telemetry Completeness
          </span>
          <Database className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-emerald-600">100.0%</span>
          <span className="text-xs text-slate-500 font-medium">(3 / 3 Samples)</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verified Physical Outage</span>
        </div>
      </div>

      {/* Metric 4: Topology Traversal SLA */}
      <div className="clean-card p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            2-Hop Traversal Latency
          </span>
          <Server className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-blue-600">{latencyMs || 0.85} ms</span>
          <span className="text-xs text-slate-500 font-medium">Target &lt; 2,000 ms</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 w-fit font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>p95 SLA Compliant</span>
        </div>
      </div>
    </div>
  );
}

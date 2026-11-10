import React from 'react';
import { BarChart3, AlertTriangle, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

export default function KpiTable({ records }) {
  return (
    <div className="glass-panel p-5 border border-slate-800 flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            KPI Engine: Telemetry &amp; Evidence Quality
          </h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          15-Min Windows (3GPP Aligned)
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <th className="pb-2.5">Entity</th>
              <th className="pb-2.5">Window</th>
              <th className="pb-2.5">Metric</th>
              <th className="pb-2.5">Value</th>
              <th className="pb-2.5">Quality Status</th>
              <th className="pb-2.5">Samples</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {records.map((r, i) => {
              const isComplete = r.quality_status === 'COMPLETE';
              const isPartial = r.quality_status === 'PARTIAL';
              const timeStr = new Date(r.timestamp).toISOString().substring(11, 16) + ' UTC';

              return (
                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 font-bold text-slate-200">{r.entity_id}</td>
                  <td className="py-2.5 text-slate-400">{timeStr}</td>
                  <td className="py-2.5 font-sans text-slate-300">{r.kpi_name}</td>
                  <td className="py-2.5 font-bold">
                    <span className={r.value === 0 && r.kpi_name === 'CELL_AVAILABILITY' ? 'text-rose-400' : r.value > 50 && r.kpi_name === 'TRANSPORT_PACKET_LOSS' ? 'text-rose-400' : 'text-slate-100'}>
                      {r.value} {r.unit}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isComplete
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isPartial
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {r.quality_status}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400">
                    {Math.round(r.completeness_score * 100)}% ({r.sample_count}/{r.expected_samples})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Uncertainty Explanatory Callout */}
      <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2 text-xs">
        <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-300">
          <strong className="text-white">Evidence Integrity Rule:</strong> <code>CELL_001</code> has{' '}
          <strong className="text-emerald-400">100% counter completeness</strong> (genuine backhaul failure). Control cell{' '}
          <code>CELL_099</code> has <strong className="text-amber-400">33% completeness</strong> (telemetry gap / uncertainty). Autonomous agents halt and decline action when uncertainty is detected.
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { BarChart3, AlertTriangle, CheckCircle2, HelpCircle, HardDrive } from 'lucide-react';

export default function KpiTable({ records }) {
  return (
    <div className="cyber-panel hud-corner p-5 border border-emerald-500/30 bg-cyber-card/90 flex flex-col h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
            KPI Engine // Sliding Watermark Audits
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-emerald-400 border border-emerald-500/30">
          15-MIN BUCKET • 2H WATERMARK
        </span>
      </div>

      {/* Cyber Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-cyan-500/20 text-cyan-400/80 font-bold uppercase text-[9.5px] tracking-wider">
              <th className="pb-2.5">ENTITY_ID</th>
              <th className="pb-2.5">WINDOW_UTC</th>
              <th className="pb-2.5">METRIC_TYPE</th>
              <th className="pb-2.5">AGG_VALUE</th>
              <th className="pb-2.5">INTEGRITY_CERT</th>
              <th className="pb-2.5">SAMPLES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-500/10">
            {records.map((r, i) => {
              const isComplete = r.quality_status === 'COMPLETE';
              const isPartial = r.quality_status === 'PARTIAL';
              const timeStr = new Date(r.timestamp).toISOString().substring(11, 16) + 'Z';

              return (
                <tr key={i} className="hover:bg-cyan-500/5 transition-colors">
                  <td className="py-2 font-bold text-white">{r.entity_id}</td>
                  <td className="py-2 text-slate-400">{timeStr}</td>
                  <td className="py-2 text-cyan-300 font-sans">{r.kpi_name}</td>
                  <td className="py-2 font-bold">
                    <span className={r.value === 0 && r.kpi_name === 'CELL_AVAILABILITY' ? 'text-rose-400 text-glow-crimson' : r.value > 50 && r.kpi_name === 'TRANSPORT_PACKET_LOSS' ? 'text-rose-400 text-glow-crimson' : 'text-slate-200'}>
                      {r.value} {r.unit}
                    </span>
                  </td>
                  <td className="py-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                        isComplete
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : isPartial
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {r.quality_status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-400">
                    {Math.round(r.completeness_score * 100)}% ({r.sample_count}/{r.expected_samples})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Uncertainty Explanatory Callout */}
      <div className="mt-3 p-2.5 rounded bg-black/80 border border-cyan-500/30 flex items-start gap-2 text-xs font-mono">
        <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[10.5px] text-slate-300 leading-relaxed">
          <strong className="text-cyan-300">EVIDENCE PROTOCOL:</strong> <code>CELL_001</code> has{' '}
          <strong className="text-emerald-400">100% counter completeness</strong> (verified physical outage). Control cell{' '}
          <code>CELL_099</code> has <strong className="text-amber-400">33% completeness</strong> (telemetry data gap). Agents decline action when data integrity &lt; 80%.
        </div>
      </div>
    </div>
  );
}

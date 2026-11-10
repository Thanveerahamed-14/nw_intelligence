import React from 'react';
import { BarChart3, HelpCircle } from 'lucide-react';

export default function KpiTable({ records }) {
  return (
    <div className="clean-card p-5 border border-slate-200 bg-white shadow-sm flex flex-col h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            KPI Engine: Telemetry &amp; Evidence Quality
          </h2>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
          15-Min Windows (3GPP Aligned)
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-2">Entity</th>
              <th className="py-2.5 px-2">Window</th>
              <th className="py-2.5 px-2">Metric</th>
              <th className="py-2.5 px-2">Value</th>
              <th className="py-2.5 px-2">Quality Status</th>
              <th className="py-2.5 px-2">Samples</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {records.map((r, i) => {
              const isComplete = r.quality_status === 'COMPLETE';
              const isPartial = r.quality_status === 'PARTIAL';
              const timeStr = new Date(r.timestamp).toISOString().substring(11, 16) + ' UTC';

              return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-2 font-bold text-slate-800">{r.entity_id}</td>
                  <td className="py-2.5 px-2 text-slate-500">{timeStr}</td>
                  <td className="py-2.5 px-2 font-sans text-slate-700 font-medium">{r.kpi_name}</td>
                  <td className="py-2.5 px-2 font-bold">
                    <span
                      className={
                        r.value === 0 && r.kpi_name === 'CELL_AVAILABILITY'
                          ? 'text-red-600'
                          : r.value > 50 && r.kpi_name === 'TRANSPORT_PACKET_LOSS'
                          ? 'text-amber-600'
                          : 'text-slate-800'
                      }
                    >
                      {r.value} {r.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                        isComplete
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : isPartial
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {r.quality_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-slate-500">
                    {Math.round(r.completeness_score * 100)}% ({r.sample_count}/{r.expected_samples})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Uncertainty Explanatory Callout */}
      <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-2.5 text-xs font-sans">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-700 leading-relaxed">
          <strong className="text-slate-900">Evidence Integrity Rule:</strong> <code>CELL_001</code> has{' '}
          <strong className="text-emerald-700">100% counter completeness</strong> (genuine backhaul failure). Control cell{' '}
          <code>CELL_099</code> has <strong className="text-amber-700">33% completeness</strong> (telemetry gap / uncertainty). Autonomous agents halt and decline action when uncertainty is detected.
        </div>
      </div>
    </div>
  );
}

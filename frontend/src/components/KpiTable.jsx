import React from 'react';
import { BarChart3, HelpCircle, ShieldAlert, Cpu } from 'lucide-react';

// Seeded control fixture: a separate branch (SITE_BETA) whose telemetry is
// deliberately incomplete. It demonstrates the evidence-integrity gate and is
// not part of the 10:05 UTC incident being remediated.
const CONTROL_ENTITY_IDS = new Set(['CELL_099']);

export default function KpiTable({ records }) {
  return (
    <div className="clean-card p-5 border border-slate-800/80 bg-slate-900/80 backdrop-blur-md rounded-xl shadow-2xl flex flex-col h-[440px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              KPI Engine: Telemetry &amp; Evidence Quality
            </h2>
            <p className="text-[11px] text-slate-400">
              Deterministic counter validation across sliding windows (3GPP TS 28.552 / 32.401)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-emerald-400 font-semibold shadow-inner">
            15-Min Windows (3GPP Aligned)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 backdrop-blur-sm z-10">
              <th className="py-2.5 px-3">Entity</th>
              <th className="py-2.5 px-3">Window</th>
              <th className="py-2.5 px-3">Metric</th>
              <th className="py-2.5 px-3">Value</th>
              <th className="py-2.5 px-3">Quality Status</th>
              <th className="py-2.5 px-3">Samples &amp; Completeness</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {records.map((r, i) => {
              const isComplete = r.quality_status === 'COMPLETE';
              const isPartial = r.quality_status === 'PARTIAL';
              const timeStr = new Date(r.timestamp).toISOString().substring(11, 16) + ' UTC';

              const isCriticalLoss = r.value > 50 && r.kpi_name === 'TRANSPORT_PACKET_LOSS';
              const isOutage = r.value === 0 && r.kpi_name === 'CELL_AVAILABILITY';

              return (
                <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-cyan-300 tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
                    {r.entity_id}
                    {CONTROL_ENTITY_IDS.has(r.entity_id) && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[9px] font-bold tracking-wide">
                        CONTROL
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{timeStr}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200 font-medium">{r.kpi_name}</td>
                  <td className="py-2.5 px-3 font-bold">
                    <span
                      className={
                        isOutage
                          ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                          : isCriticalLoss
                          ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                          : 'text-emerald-400'
                      }
                    >
                      {r.value} {r.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide inline-flex items-center gap-1 ${
                        isComplete
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : isPartial
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${isComplete ? 'bg-emerald-400' : isPartial ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                      {r.quality_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            r.completeness_score >= 0.95
                              ? 'bg-emerald-500'
                              : r.completeness_score >= 0.5
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.round(r.completeness_score * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {Math.round(r.completeness_score * 100)}% ({r.sample_count}/{r.expected_samples})
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Uncertainty Explanatory Callout */}
      <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-cyan-900/40 flex items-start gap-2.5 text-xs font-sans">
        <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-cyan-300">Deterministic Evidence Integrity Gate:</strong>{' '}
          <code className="text-cyan-200 bg-slate-900 px-1 py-0.5 rounded border border-slate-800 font-mono">CELL_001</code> has{' '}
          <strong className="text-emerald-400">100% counter completeness</strong> (verified physical backhaul degradation). Control cell{' '}
          <code className="text-amber-200 bg-slate-900 px-1 py-0.5 rounded border border-slate-800 font-mono">CELL_099</code> has{' '}
          <strong className="text-amber-400">33% completeness</strong> (telemetry collection gap). Autonomous agents halt remediation and refuse speculative execution whenever confidence intervals are compromised.
        </div>
      </div>
    </div>
  );
}

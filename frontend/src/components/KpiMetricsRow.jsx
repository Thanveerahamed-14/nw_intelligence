import React from 'react';
import { Activity, Server, Database, CheckCircle2, AlertOctagon, TrendingDown, Radio } from 'lucide-react';

export default function KpiMetricsRow({ latencyMs, report }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      {/* Metric 1: Radio Availability */}
      <div className="cyber-panel hud-corner hud-corner-danger p-4 border border-rose-500/30 bg-cyber-card/90 hover:border-rose-500/50 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400/90 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            CELL_AVAILABILITY [10:05]
          </span>
          <Activity className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-display font-bold text-rose-400 text-glow-crimson">0.0 %</span>
          <span className="text-xs font-mono text-slate-500 line-through">100.0% BASELINE</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40 w-fit">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
          <span>MAJOR OUTAGE: 3 SECTORS DOWN</span>
        </div>
      </div>

      {/* Metric 2: Transport Backhaul Packet Loss */}
      <div className="cyber-panel hud-corner hud-corner-warning p-4 border border-amber-500/30 bg-cyber-card/90 hover:border-amber-500/50 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            CSR-01 FIBER PACKET LOSS
          </span>
          <Server className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-display font-bold text-amber-400 text-glow-amber">94.2 %</span>
          <span className="text-xs font-mono text-amber-400/60">SPIKE @ 10:03:00Z</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 w-fit">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>OPTICAL INTERFACE DISCARDS</span>
        </div>
      </div>

      {/* Metric 3: Evidence Completeness */}
      <div className="cyber-panel hud-corner hud-corner-success p-4 border border-emerald-500/30 bg-cyber-card/90 hover:border-emerald-500/50 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            COUNTER INTEGRITY SCORE
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-display font-bold text-emerald-400 text-glow-emerald">100.0 %</span>
          <span className="text-xs font-mono text-slate-400">[3 / 3 AUDITED]</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 w-fit">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>CONFIRMED PHYSICAL FAILURE</span>
        </div>
      </div>

      {/* Metric 4: Topology Traversal SLA */}
      <div className="cyber-panel hud-corner p-4 border border-cyan-500/30 bg-cyber-card/90 hover:border-cyan-500/50 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400/90 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            2-HOP BFS LATENCY (p95)
          </span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-display font-bold text-cyan-400 text-glow-cyan">{latencyMs || 0.85} ms</span>
          <span className="text-xs font-mono text-slate-400">CEILING &lt; 2,000 ms</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40 w-fit">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>SLA CONTRACT GUARANTEED</span>
        </div>
      </div>
    </div>
  );
}

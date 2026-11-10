import React from 'react';
import { Radio, AlertTriangle, ShieldCheck, Zap, UserCheck, Layers, Terminal, Crosshair } from 'lucide-react';

export default function Header({
  tenant,
  setTenant,
  role,
  setRole,
  isInvestigating,
  onRunInvestigation
}) {
  return (
    <header className="cyber-panel hud-corner p-4 mb-5 border border-cyan-500/20 bg-cyber-panel/90 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Incident Status */}
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 rounded bg-black/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
          <Radio className="w-6 h-6 animate-pulse text-cyan-400" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500"></span>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold font-display tracking-wider text-white flex items-center gap-2 uppercase">
              <span className="text-cyan-400 text-glow-cyan">NOC // DEFENSE</span>
              <span className="text-slate-200">Intelligence Grid</span>
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider rounded bg-rose-950/60 text-rose-400 border border-rose-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(255,0,85,0.3)]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              CRITICAL INCIDENT @ 10:05 UTC
            </span>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_8px_rgba(0,255,157,0.2)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              p95 SLA &lt; 2.0s
            </span>
          </div>
          <p className="text-[11px] font-mono text-cyan-400/70 mt-0.5 tracking-wide flex items-center gap-2">
            <span>SEC_LEVEL: TOP_SECRET</span>
            <span className="text-slate-600">//</span>
            <span>AUTONOMOUS AGENTS + MCP BOUNDARY</span>
            <span className="text-slate-600">//</span>
            <span>BI-TEMPORAL GRAPH REPLAY</span>
          </p>
        </div>
      </div>

      {/* Governance Controls: Tenant & Role Switchers */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Tenant Scope */}
        <div className="flex flex-col text-left">
          <label className="text-[10px] uppercase font-mono font-bold text-cyan-400 tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" /> Tenant Partition
          </label>
          <div className="relative">
            <select
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              className="bg-black/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs rounded px-3 py-1.5 outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,240,255,0.4)] cursor-pointer pr-7"
            >
              <option value="customer_a">CUSTOMER_A (Primary Slice)</option>
              <option value="customer_b">CUSTOMER_B (Isolated Airgap)</option>
            </select>
          </div>
        </div>

        {/* Role Selector */}
        <div className="flex flex-col text-left">
          <label className="text-[10px] uppercase font-mono font-bold text-purple-400 tracking-wider flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-purple-400" /> Agent RBAC Identity
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-black/80 border border-purple-500/40 text-purple-300 font-mono text-xs rounded px-3 py-1.5 outline-none focus:border-purple-400 focus:shadow-[0_0_10px_rgba(176,38,255,0.4)] cursor-pointer"
          >
            <option value="alarm_management">ALARM_MANAGEMENT_AGENT</option>
            <option value="performance_analysis">PERFORMANCE_ANALYSIS_AGENT</option>
            <option value="change_planning">CHANGE_PLANNING_AGENT</option>
            <option value="human_operator">HUMAN_OPERATOR (HITL APPROVER)</option>
          </select>
        </div>

        {/* Run CTA */}
        <button
          onClick={onRunInvestigation}
          disabled={isInvestigating}
          className={`relative px-4 py-2 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 border transition-all duration-300 mt-3.5 ${
            isInvestigating
              ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-500 cursor-not-allowed animate-pulse'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] active:scale-95'
          }`}
        >
          <Zap className={`w-4 h-4 text-cyan-400 ${isInvestigating ? 'animate-spin' : ''}`} />
          {isInvestigating ? 'DISPATCHING AGENT...' : 'DISPATCH 10:05 INCIDENT'}
        </button>
      </div>
    </header>
  );
}

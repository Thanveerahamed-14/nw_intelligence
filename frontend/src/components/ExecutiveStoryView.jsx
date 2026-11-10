import React from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Radio, Server, Wifi, Layers, AlertTriangle } from 'lucide-react';

export default function ExecutiveStoryView({
  tenant,
  report,
  stagedAction,
  isInvestigating,
  onRunInvestigation,
  onApprove,
  onReject,
  role
}) {
  const isApproved = stagedAction?.status === 'APPROVED' || stagedAction?.status === 'EXECUTED';
  const isPending = stagedAction?.status === 'PENDING_APPROVAL';

  return (
    <div className="space-y-4">
      {/* Interactive App Banner */}
      <div className="clean-card p-4 md:p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              ACTIVE OUTAGE &bull; 10:05 UTC
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              Downtown Alpha Sector
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              Tenant: {tenant}
            </span>
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
            Incident Overview &bull; 3 Cellular Sectors Degraded
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!report ? (
            <button
              onClick={onRunInvestigation}
              disabled={isInvestigating}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:bg-blue-400"
            >
              <Zap className={`w-3.5 h-3.5 ${isInvestigating ? 'animate-spin' : ''}`} />
              {isInvestigating ? 'Running LangGraph...' : 'Run LangGraph Investigation'}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Diagnosed in {report.total_duration_ms} ms</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 Structured Metric Cards (App Widgets instead of text essay) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Widget 1: Incident */}
        <div className="clean-card p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">1. The Alarm</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              0% Availability
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">3 Towers Offline</div>
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 font-mono">
            <div className="flex justify-between"><span>Ericsson 5G:</span><strong className="text-slate-800">CELL_001, CELL_002</strong></div>
            <div className="flex justify-between"><span>Nokia 4G:</span><strong className="text-slate-800">CELL_003</strong></div>
          </div>
        </div>

        {/* Widget 2: Diagnosis */}
        <div className="clean-card p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">2. AI Diagnosis</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              94.2% Packet Drop
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">Physical Fiber Cut</div>
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 font-mono">
            <div className="flex justify-between"><span>Shared Router:</span><strong className="text-amber-700">CSR_ALPHA_01</strong></div>
            <div className="flex justify-between"><span>Broken Link:</span><strong className="text-rose-600">LINK_BACKHAUL_09</strong></div>
          </div>
        </div>

        {/* Widget 3: Remediation */}
        <div className="clean-card p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">3. Action Staged</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {isApproved ? 'EXECUTED' : 'PENDING APPROVAL'}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">Reroute to Microwave</div>
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 font-mono">
            <div className="flex justify-between"><span>Backup Dish:</span><strong className="text-emerald-700">STANDBY_09 (10G)</strong></div>
            <div className="flex justify-between"><span>Safety Gate:</span><strong className="text-slate-800">Requires Human Sign-off</strong></div>
          </div>
        </div>
      </div>

      {/* Visual Topology Path Diagram */}
      <div className="clean-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600" />
            End-to-End Incident Path &amp; Redundancy Bypass
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">Live Infrastructure Map</span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 overflow-x-auto">
          {/* Step A: Towers */}
          <div className="flex flex-col items-center text-center p-3 rounded-lg bg-white border border-rose-200 shadow-sm min-w-[130px]">
            <Radio className="w-6 h-6 text-rose-600 mb-1" />
            <span className="text-xs font-bold text-slate-900">3 Cell Antennas</span>
            <span className="text-[10px] text-rose-600 font-bold">0% Availability</span>
            <span className="text-[10px] text-slate-400 font-mono">CELL_001, 002, 003</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden md:block" />

          {/* Step B: Shared Router */}
          <div className="flex flex-col items-center text-center p-3 rounded-lg bg-white border border-amber-200 shadow-sm min-w-[140px]">
            <Server className="w-6 h-6 text-amber-600 mb-1" />
            <span className="text-xs font-bold text-slate-900">Shared Station Router</span>
            <span className="text-[10px] text-amber-700 font-bold font-mono">CSR_ALPHA_01</span>
            <span className="text-[10px] text-slate-400">Cisco ASR-903</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden md:block" />

          {/* Step C: Redundant Link Split */}
          <div className="flex flex-col gap-2 min-w-[230px]">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-rose-300 shadow-sm text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
              <div className="text-[11px]">
                <strong className="text-rose-700 block">Primary Fiber (Failing)</strong>
                <span className="text-slate-500 font-mono text-[10px]">94.2% Packet Drop</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-emerald-300 shadow-sm text-left">
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-[11px]">
                <strong className="text-emerald-800 block">Backup Microwave (Healthy)</strong>
                <span className="text-slate-500 font-mono text-[10px]">0.02% Loss &bull; 10G Ready</span>
              </div>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden md:block" />

          {/* Step D: Core Network */}
          <div className="flex flex-col items-center text-center p-3 rounded-lg bg-white border border-blue-200 shadow-sm min-w-[130px]">
            <Layers className="w-6 h-6 text-blue-600 mb-1" />
            <span className="text-xs font-bold text-slate-900">City Core Network</span>
            <span className="text-[10px] text-emerald-700 font-bold">Online</span>
            <span className="text-[10px] text-slate-400 font-mono">AGG_ROUTER_01</span>
          </div>
        </div>
      </div>

      {/* HITL Quick Action Bar */}
      {stagedAction && isPending && (
        <div className="clean-card p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Remediation staged: Switch traffic from damaged fiber to standby microwave link.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onApprove}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve &amp; Restore Service
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs active:scale-95 transition-all"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Production Change Executed: Traffic successfully diverted to backup microwave link. Downtown cell towers restored.</span>
        </div>
      )}
    </div>
  );
}

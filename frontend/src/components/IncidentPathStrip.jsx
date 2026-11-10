import React from 'react';
import { Radio, Server, ArrowRight, Wifi, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function IncidentPathStrip({ stagedAction, onApprove, onReject, role }) {
  const isApproved = stagedAction?.status === 'APPROVED' || stagedAction?.status === 'EXECUTED';
  const isPending = stagedAction?.status === 'PENDING_APPROVAL';

  return (
    <div className="clean-card p-3 mb-4 bg-slate-900/80 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Quick Label */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/80"></span>
          <span className="text-xs font-bold text-slate-200 tracking-wide uppercase text-[11px]">
            Physical Topology Bypass:
          </span>
        </div>

        {/* Center: Compact Visual Node Chain */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs w-full lg:w-auto py-1">
          {/* Step 1: Towers */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 shrink-0">
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-bold">3 Antennas</span>
            <span className="text-[10px] text-rose-400 font-mono">(0% Signal)</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 2: Shared Router */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 shrink-0">
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">CSR_ALPHA_01</span>
            <span className="text-[10px] text-amber-400/80 font-mono">(Shared Router)</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 3: Failing Fiber vs Ready Microwave */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 font-medium shadow-sm shadow-rose-950">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>Fiber: <strong className="text-white font-mono">94.2% Drop</strong></span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold">&rarr;</span>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-medium">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Microwave: <strong className="text-emerald-200 font-mono">0.02% Ready</strong></span>
            </div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

          {/* Step 4: Core */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">City Core</span>
          </div>
        </div>

        {/* Right: Quick Action if Pending */}
        {stagedAction && isPending && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-amber-400 font-semibold hidden sm:inline">
              Reroute Staged:
            </span>
            <button
              onClick={onApprove}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Reroute
            </button>
          </div>
        )}

        {isApproved && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold shrink-0 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reroute Active (Restored)</span>
          </div>
        )}
      </div>
    </div>
  );
}

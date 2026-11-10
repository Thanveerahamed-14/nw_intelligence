import React from 'react';
import { Radio, Server, ArrowRight, Wifi, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function IncidentPathStrip({ stagedAction, onApprove, onReject, role }) {
  const isApproved = stagedAction?.status === 'APPROVED' || stagedAction?.status === 'EXECUTED';
  const isPending = stagedAction?.status === 'PENDING_APPROVAL';

  return (
    <div className="clean-card p-3 mb-4 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Quick Label */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800">Physical Topology Bypass:</span>
        </div>

        {/* Center: Compact Visual Node Chain */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs w-full lg:w-auto py-1">
          {/* Step 1: Towers */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 shrink-0">
            <Radio className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-bold">3 Antennas</span>
            <span className="text-[10px] text-rose-600 font-mono">(0% Signal)</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* Step 2: Shared Router */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 shrink-0">
            <Server className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-bold">CSR_ALPHA_01</span>
            <span className="text-[10px] text-amber-700">(Shared Router)</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* Step 3: Failing Fiber vs Ready Microwave */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100/70 border border-rose-300 text-rose-900 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
              <span>Fiber: <strong>94.2% Drop</strong></span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold">&rarr;</span>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 font-medium">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Microwave: <strong>0.02% Ready</strong></span>
            </div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* Step 4: Core */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold">City Core</span>
          </div>
        </div>

        {/* Right: Quick Action if Pending */}
        {stagedAction && isPending && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-amber-700 font-semibold hidden sm:inline">
              Reroute Staged:
            </span>
            <button
              onClick={onApprove}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 transition-all shadow-xs active:scale-95"
            >
              <CheckCircle2 className="w-3 h-3" />
              Approve Reroute
            </button>
          </div>
        )}

        {isApproved && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Reroute Active (Restored)</span>
          </div>
        )}
      </div>
    </div>
  );
}

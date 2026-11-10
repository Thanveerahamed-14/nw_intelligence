import React from 'react';
import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Zap, Radio, Server, Wifi, RefreshCw, Layers } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Friendly Overview Banner */}
      <div className="clean-card p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950/40 border border-slate-700/80 rounded-2xl shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Live Incident Summary • 10:05 UTC
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Mobile Service Outage in Downtown Alpha
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              At 10:05 UTC, three 5G and 4G cell towers stopped serving mobile users. Our AI agent investigated the root cause, verified the data isn't a false alarm, and prepared a safe backup reroute for your review.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {!report ? (
              <button
                onClick={onRunInvestigation}
                disabled={isInvestigating}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <Zap className={`w-4 h-4 ${isInvestigating ? 'animate-spin' : ''}`} />
                {isInvestigating ? 'AI Detective Working...' : 'Run Automated Investigation'}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                AI Investigation Complete (Took {report.total_duration_ms} ms)
              </div>
            )}
            <span className="text-xs text-slate-400">Strictly isolated for {tenant === 'customer_a' ? 'Customer A' : 'Customer B'}</span>
          </div>
        </div>
      </div>

      {/* 3-Step Simple Story Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: The Problem */}
        <div className="clean-card p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-rose-400 block mb-1">
              The Problem
            </span>
            <h3 className="text-base font-bold text-white">3 Cell Towers Offline</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Towers <strong>CELL_001</strong>, <strong>CELL_002</strong>, and <strong>CELL_003</strong> suddenly reported 0% availability. Local phone calls and internet connections stopped.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Customer Impact:</span>
              <span className="text-rose-400 font-semibold">Downtown Sector Down</span>
            </div>
            <div className="flex justify-between">
              <span>Equipment:</span>
              <span className="text-slate-200">Ericsson &amp; Nokia Towers</span>
            </div>
          </div>
        </div>

        {/* Step 2: The Diagnosis */}
        <div className="clean-card p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-blue-400 block mb-1">
              AI Detective Findings
            </span>
            <h3 className="text-base font-bold text-white">Broken Optical Fiber Cable</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The AI traced all three towers back to a shared router and found the primary fiber cable is dropping <strong>94.2% of data</strong>.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Verified Outage:</span>
              <span className="text-emerald-400 font-semibold">100% Data Integrity</span>
            </div>
            <div className="flex justify-between">
              <span>False Alarm Check:</span>
              <span className="text-emerald-400 font-semibold">Passed (Not a missing sensor)</span>
            </div>
          </div>
        </div>

        {/* Step 3: The Solution */}
        <div className="clean-card p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-amber-400 block mb-1">
              Proposed Solution
            </span>
            <h3 className="text-base font-bold text-white">Switch to Backup Microwave Dish</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The AI identified an active backup wireless microwave link ready to take the load. Traffic can be restored in seconds.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Safety Blast Radius:</span>
              <span className="text-slate-200 font-semibold">Safe (Router Alpha only)</span>
            </div>
            <div className="flex justify-between">
              <span>Rollback Plan:</span>
              <span className="text-slate-200 font-semibold">Instant Automatic Revert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Simple Network Path Map */}
      <div className="clean-card p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-400" />
              Simple Network Connection Map
            </h3>
            <p className="text-xs text-slate-400">
              Shows how the cell towers connect to the city internet core and where the physical break happened.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-medium">
            Customer A Network
          </span>
        </div>

        {/* Simplified Diagram Visualizer */}
        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 overflow-x-auto">
          {/* Step A: Towers */}
          <div className="flex flex-col items-center text-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 min-w-[130px]">
            <Radio className="w-8 h-8 text-rose-400 mb-1" />
            <span className="text-xs font-bold text-white">3 Cell Towers</span>
            <span className="text-[11px] text-rose-400 font-medium">Offline (0% Signal)</span>
            <span className="text-[10px] text-slate-500 mt-1">CELL_001, 002, 003</span>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-500 shrink-0 hidden md:block" />

          {/* Step B: Shared Station Router */}
          <div className="flex flex-col items-center text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 min-w-[140px]">
            <Server className="w-8 h-8 text-amber-400 mb-1" />
            <span className="text-xs font-bold text-white">Shared Site Router</span>
            <span className="text-[11px] text-amber-300 font-medium">CSR_ALPHA_01</span>
            <span className="text-[10px] text-slate-500 mt-1">Connects all 3 towers</span>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-500 shrink-0 hidden md:block" />

          {/* Step C: The Split (Failing Fiber vs Standby Microwave) */}
          <div className="flex flex-col gap-2 min-w-[220px]">
            {/* Primary Fiber (Broken) */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40">
              <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 animate-ping"></span>
              <div className="text-left text-xs">
                <div className="font-bold text-rose-300">Primary Fiber Cable</div>
                <div className="text-[11px] text-rose-400">94.2% Packet Loss (Physical Cut)</div>
              </div>
            </div>

            {/* Standby Microwave (Ready) */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40">
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left text-xs">
                <div className="font-bold text-emerald-300">Backup Microwave Dish</div>
                <div className="text-[11px] text-emerald-400">100% Ready (Awaiting Sign-off)</div>
              </div>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-500 shrink-0 hidden md:block" />

          {/* Step D: Core Network */}
          <div className="flex flex-col items-center text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 min-w-[130px]">
            <Layers className="w-8 h-8 text-blue-400 mb-1" />
            <span className="text-xs font-bold text-white">City Internet Core</span>
            <span className="text-[11px] text-emerald-400 font-medium">Healthy &amp; Online</span>
            <span className="text-[10px] text-slate-500 mt-1">Central Aggregator</span>
          </div>
        </div>
      </div>

      {/* Human Approval Decision Box (Simple & Actionable) */}
      <div className="clean-card p-6 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Human-in-the-Loop Decision Gate
            </h3>
            <p className="text-xs text-slate-400">
              To protect the network, autonomous AI cannot make live changes without human authorization.
            </p>
          </div>
        </div>

        {stagedAction && isPending && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                Action: Switch mobile traffic from failing fiber to backup microwave dish
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold">
                Waiting for Your Approval
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Why:</strong> Restores phone and internet service to Downtown cells in seconds without waiting for hours for field technicians to splice the broken underground fiber.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onApprove}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                Yes, Approve &amp; Restore Mobile Service
              </button>
              <button
                onClick={onReject}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
              >
                Reject &amp; Dispatch Field Crew Instead
              </button>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Reroute Successfully Executed!</div>
              <div className="text-xs text-emerald-300 mt-0.5">
                Traffic has been switched to the backup microwave dish. Cell availability is restored to nominal levels.
              </div>
            </div>
          </div>
        )}

        {!stagedAction && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
            Click <strong>"Run Automated Investigation"</strong> above to have the AI find the problem and stage the recommended fix here.
          </div>
        )}
      </div>
    </div>
  );
}

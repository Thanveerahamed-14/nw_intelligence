import React from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Radio, Server, Wifi, Layers, AlertCircle, FileText } from 'lucide-react';

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
      <div className="clean-card p-6 bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border border-blue-200/70 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Live Incident Summary • 10:05 UTC
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Mobile Service Outage in Downtown Alpha
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              At 10:05 UTC, three 5G and 4G mobile cell towers suddenly stopped serving customers. Our autonomous AI detective traced the upstream network, identified a severe fiber cable failure, and staged a zero-downtime backup reroute for your review.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {!report ? (
              <button
                onClick={onRunInvestigation}
                disabled={isInvestigating}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <Zap className={`w-4 h-4 ${isInvestigating ? 'animate-spin' : ''}`} />
                {isInvestigating ? 'AI Detective Working...' : 'Run Automated Investigation'}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Investigation Complete ({report.total_duration_ms} ms)
              </div>
            )}
            <span className="text-xs text-slate-500 font-medium">Tenant Scope: {tenant === 'customer_a' ? 'Customer A' : 'Customer B'}</span>
          </div>
        </div>
      </div>

      {/* 3-Step Simple Story Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: The Problem */}
        <div className="clean-card p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm hover:border-slate-300 transition-all">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-rose-600 block mb-0.5">
              The Incident
            </span>
            <h3 className="text-base font-bold text-slate-900">3 Cell Towers Offline</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Towers <strong>CELL_001</strong>, <strong>CELL_002</strong>, and <strong>CELL_003</strong> reported a sudden 0% availability collapse. Local subscribers cannot connect.
          </p>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span>Customer Impact:</span>
              <span className="text-rose-600 font-bold">Downtown Outage</span>
            </div>
            <div className="flex justify-between">
              <span>Equipment:</span>
              <span className="text-slate-800">Ericsson 5G &amp; Nokia 4G</span>
            </div>
          </div>
        </div>

        {/* Step 2: The Diagnosis */}
        <div className="clean-card p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm hover:border-slate-300 transition-all">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-blue-600 block mb-0.5">
              AI Detective Findings
            </span>
            <h3 className="text-base font-bold text-slate-900">Broken Fiber Cable Found</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Upstream tracing pinpointed primary fiber link <strong>LINK_BACKHAUL_09</strong> with a <strong>94.2% packet drop</strong> on router <strong>CSR_ALPHA_01</strong>.
          </p>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span>Data Trustworthiness:</span>
              <span className="text-emerald-700 font-bold">100% Complete</span>
            </div>
            <div className="flex justify-between">
              <span>Verification:</span>
              <span className="text-emerald-700 font-bold">Confirmed Physical Cut</span>
            </div>
          </div>
        </div>

        {/* Step 3: The Solution */}
        <div className="clean-card p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm hover:border-slate-300 transition-all">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-700 block mb-0.5">
              Recommended Solution
            </span>
            <h3 className="text-base font-bold text-slate-900">Switch to Backup Microwave</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The AI staged an automated switch to <strong>Standby Microwave Link 09</strong>. This restores cellular service immediately while technicians repair the fiber.
          </p>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span>Safety Blast Radius:</span>
              <span className="text-slate-800 font-bold">Router Alpha Only</span>
            </div>
            <div className="flex justify-between">
              <span>Rollback Procedure:</span>
              <span className="text-slate-800 font-bold">Automatic If Latency &gt;15ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured AI Report Summary (If Available) */}
      {report && (
        <div className="clean-card p-6 bg-white border border-emerald-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            AI Root Cause Synthesis &amp; Engineering Verdict
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm leading-relaxed space-y-2">
            <p className="font-medium text-slate-900">{report.root_cause_summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block font-medium">Affected Nodes:</span>
                <span className="text-slate-900 font-bold font-mono">NODE_42 (Ericsson), NODE_43 (Nokia)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block font-medium">Common Dependency:</span>
                <span className="text-amber-700 font-bold font-mono">CSR_ALPHA_01 (Cisco ASR-903)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block font-medium">Remediation Path:</span>
                <span className="text-emerald-700 font-bold font-mono">LINK_BACKHAUL_STANDBY_09</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Simple Network Path Map */}
      <div className="clean-card p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-600" />
              Physical Network Path &amp; Failure Point
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear visual map of how towers connect through the shared router to the city core.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
            Customer A Slices
          </span>
        </div>

        {/* Simplified Diagram Visualizer */}
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 overflow-x-auto">
          {/* Step A: Towers */}
          <div className="flex flex-col items-center text-center p-3.5 rounded-xl bg-white border border-rose-200 shadow-sm min-w-[140px]">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-2">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">3 Cell Towers</span>
            <span className="text-[11px] text-rose-600 font-bold">Offline (0% Signal)</span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-mono">CELL_001, 002, 003</span>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 hidden md:block" />

          {/* Step B: Shared Station Router */}
          <div className="flex flex-col items-center text-center p-3.5 rounded-xl bg-white border border-amber-200 shadow-sm min-w-[150px]">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Shared Site Router</span>
            <span className="text-[11px] text-amber-700 font-bold">CSR_ALPHA_01</span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-mono">Cisco ASR-903</span>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 hidden md:block" />

          {/* Step C: The Split (Failing Fiber vs Standby Microwave) */}
          <div className="flex flex-col gap-2.5 min-w-[240px]">
            {/* Primary Fiber (Broken) */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-rose-300 shadow-sm">
              <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 animate-ping"></span>
              <div className="text-left text-xs">
                <div className="font-bold text-rose-700">Primary Optical Fiber</div>
                <div className="text-[11px] text-rose-600 font-medium">94.2% Packet Loss (Optical Degradation)</div>
              </div>
            </div>

            {/* Standby Microwave (Ready) */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-emerald-300 shadow-sm">
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left text-xs">
                <div className="font-bold text-emerald-800">Standby Microwave Link</div>
                <div className="text-[11px] text-emerald-700 font-medium">100% Ready (Awaiting Human Approval)</div>
              </div>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 hidden md:block" />

          {/* Step D: Core Network */}
          <div className="flex flex-col items-center text-center p-3.5 rounded-xl bg-white border border-blue-200 shadow-sm min-w-[140px]">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">City Core Network</span>
            <span className="text-[11px] text-emerald-700 font-bold">Healthy &amp; Online</span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-mono">AGG_ROUTER_01</span>
          </div>
        </div>
      </div>

      {/* Human Approval Decision Box (Simple, Clear & Actionable) */}
      <div className="clean-card p-6 bg-white border border-amber-300 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Human-in-the-Loop Decision Gate
            </h3>
            <p className="text-xs text-slate-500">
              Autonomous AI cannot alter live network traffic without explicit human authorization.
            </p>
          </div>
        </div>

        {stagedAction && isPending && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">
                Proposed Action: Reroute Traffic to Standby Microwave Link
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold w-fit">
                Waiting for Your Authorization
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Operational Rationale:</strong> Diverts backhaul traffic away from the degraded fiber cable to the redundant wireless dish on router <code>CSR_ALPHA_01</code>, restoring cellular connectivity for cells 001, 002, and 003 immediately.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={onApprove}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                Yes, Approve &amp; Restore Mobile Service
              </button>
              <button
                onClick={onReject}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold text-xs border border-slate-300 transition-all active:scale-95"
              >
                Reject &amp; Request Manual Dispatch
              </button>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-emerald-900">Reroute Successfully Executed!</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Traffic has been routed to the standby microwave link. Mobile cells are restored to nominal availability.
              </div>
            </div>
          </div>
        )}

        {!stagedAction && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center font-medium">
            Click <strong>"Run Automated Investigation"</strong> above to dispatch the AI detective and stage the recommended fix here.
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';

export default function HitlApprovalCard({
  action,
  onApprove,
  onReject,
  role
}) {
  const isApproved = action?.status === 'APPROVED' || action?.status === 'EXECUTED';
  const isRejected = action?.status === 'REJECTED';
  const isPending = action?.status === 'PENDING_APPROVAL';

  return (
    <div className="glass-panel p-5 border border-slate-800 flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            Governance &amp; Human-In-The-Loop (HITL) Gate
          </h2>
        </div>
        {action ? (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isApproved
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : isRejected
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
            }`}
          >
            {action.status}
          </span>
        ) : (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Awaiting Proposal
          </span>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto space-y-3 text-xs">
        {!action ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <UserCheck className="w-10 h-10 text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No Action Pending Sign-Off</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Production network mutations require human authorization. When an investigation completes, remediation proposals are staged here.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-amber-400 text-xs">
                {action.action_id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 font-mono">
                {action.action_type}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong className="text-slate-200">Justification:</strong> {action.justification}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/40 p-2 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block">Blast Radius:</span>
                <span className="text-slate-300">{action.blast_radius}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Rollback Procedure:</span>
                <span className="text-slate-300">{action.rollback_procedure}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {isPending && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={onApprove}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve &amp; Execute Reroute
                </button>
                <button
                  onClick={onReject}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 font-semibold text-xs flex items-center gap-1 border border-slate-700 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}

            {isApproved && (
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px]">
                <strong>Execution Confirmed:</strong> {action.execution_result}
              </div>
            )}

            {/* Audit Log */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Audit Lineage Trail
              </span>
              <div className="space-y-1 font-mono text-[10px] text-slate-400">
                {action.audit_trail?.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

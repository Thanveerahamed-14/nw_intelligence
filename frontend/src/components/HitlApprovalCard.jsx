import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, UserCheck, Lock } from 'lucide-react';

export default function HitlApprovalCard({
  action,
  onApprove,
  onReject,
  role
}) {
  const isApproved = action?.status === 'APPROVED' || action?.status === 'EXECUTED';
  const isRejected = action?.status === 'REJECTED';
  const isPending = action?.status === 'PENDING_APPROVAL';
  const isOperator = role === 'human_operator';

  return (
    <div className="clean-card p-5 border border-slate-800 bg-slate-900/80 flex flex-col h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Human-In-The-Loop (HITL) Governance Gate
          </h2>
        </div>
        {action ? (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
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
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Awaiting Proposal
          </span>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto space-y-3 text-xs">
        {!action ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 font-sans">
            <UserCheck className="w-10 h-10 text-slate-600 mb-2" />
            <p className="font-semibold text-slate-200">No Action Pending Sign-Off</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
              Production network mutations require human authorization. When an investigation completes, remediation proposals are staged here.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-amber-400 text-xs">
                {action.action_id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 font-mono">
                {action.action_type}
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              <strong className="text-slate-100">Justification:</strong> {action.justification}
            </p>

            <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Blast Radius:</span>
                <span className="text-slate-200 font-mono">{action.blast_radius}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Rollback Procedure:</span>
                <span className="text-slate-200 font-mono">{action.rollback_procedure}</span>
              </div>
            </div>

            {/* RBAC Notice if user role isn't operator */}
            {!isOperator && isPending && (
              <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20 text-purple-300 text-[11px] flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Switch active role to <strong>Human Operator</strong> in the header to approve this production change.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            {isPending && (
              <div className="pt-1 flex items-center gap-3">
                <button
                  onClick={onApprove}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve &amp; Execute Reroute
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
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px]">
                <strong className="text-white">Execution Confirmed:</strong> {action.execution_result}
                <div className="text-[10px] text-emerald-400/80 mt-0.5">
                  Audited by lead_operator_sarah • Cryptographic hash logged to immutable provenance store.
                </div>
              </div>
            )}

            {isRejected && (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-[11px]">
                <strong>Change Rejected:</strong> Fallback procedure logged. Incident escalated for manual field dispatch.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

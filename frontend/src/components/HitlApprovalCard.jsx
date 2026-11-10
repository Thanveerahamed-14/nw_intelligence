import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, UserCheck, Lock } from 'lucide-react';

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
    <div className="clean-card p-5 border border-slate-200 bg-white shadow-sm flex flex-col h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Human-In-The-Loop (HITL) Governance Gate
          </h2>
        </div>
        {action ? (
          <span
            className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isApproved
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : isRejected
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
            }`}
          >
            {action.status}
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
            Awaiting Proposal
          </span>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto space-y-3 text-xs font-sans">
        {!action ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <UserCheck className="w-10 h-10 text-slate-400 mb-2" />
            <p className="font-bold text-slate-800 text-sm">No Action Pending Sign-Off</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Production network mutations require human authorization. When an investigation completes, remediation proposals are staged here.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-amber-800 text-xs">
                {action.action_id}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-800 font-mono font-semibold">
                {action.action_type}
              </span>
            </div>

            <p className="text-slate-700 text-xs leading-relaxed">
              <strong className="text-slate-900">Justification:</strong> {action.justification}
            </p>

            <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block font-medium">Blast Radius:</span>
                <span className="text-slate-900 font-semibold font-mono">{action.blast_radius}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Rollback Procedure:</span>
                <span className="text-slate-900 font-semibold font-mono">{action.rollback_procedure}</span>
              </div>
            </div>

            {/* RBAC Notice if user role isn't operator */}
            {!isOperator && isPending && (
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px] flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4 text-purple-600 shrink-0" />
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
                  className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve &amp; Execute Reroute
                </button>
                <button
                  onClick={onReject}
                  className="py-2.5 px-3 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold text-xs flex items-center gap-1 border border-slate-300 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}

            {isApproved && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                <strong className="text-emerald-900">Execution Confirmed:</strong> {action.execution_result}
                <div className="text-[10px] text-emerald-700 mt-0.5">
                  Audited by lead_operator_sarah • Cryptographic hash logged to immutable provenance store.
                </div>
              </div>
            )}

            {isRejected && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px]">
                <strong>Change Rejected:</strong> Fallback procedure logged. Incident escalated for manual field dispatch.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

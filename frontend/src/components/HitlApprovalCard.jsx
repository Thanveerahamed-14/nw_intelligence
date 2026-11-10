import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, UserCheck, Lock, AlertTriangle, Key, Terminal, ArrowRight } from 'lucide-react';

export default function HitlApprovalCard({
  action,
  onApprove,
  onReject,
  role
}) {
  const [operatorComment, setOperatorComment] = useState('Verified redundant microwave capacity and alarm correlation. Approved.');
  const [isApproving, setIsApproving] = useState(false);

  const isApproved = action?.status === 'APPROVED' || action?.status === 'EXECUTED';
  const isRejected = action?.status === 'REJECTED';
  const isPending = action?.status === 'PENDING_APPROVAL';
  const isOperator = role === 'human_operator';

  async function handleApproveClick() {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="clean-card p-5 border border-slate-200 bg-white shadow-xs rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Human-in-the-Loop (HITL) Production Governance Gate
            </h2>
            <p className="text-xs text-slate-500">
              Only authorized Tier-2 NOC leads can approve and dispatch mutations to production network hardware.
            </p>
          </div>
        </div>

        {action ? (
          <span
            className={`text-xs font-mono px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
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
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
            Awaiting Staged Proposal
          </span>
        )}
      </div>

      {/* Main Body */}
      {!action ? (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 text-slate-400 space-y-2">
          <UserCheck className="w-12 h-12 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-sm">No Action Pending Sign-Off</h3>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            Autonomous AI agents are restricted to read-only diagnostics and staging. Run an investigation from the Alarm Triage workspace to stage a remediation proposal.
          </p>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Action Header Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-800 text-xs px-2 py-0.5 rounded bg-amber-100 border border-amber-200">
                  {action.action_id}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-slate-200 text-slate-800 font-mono font-semibold">
                  {action.action_type}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Target: <strong className="text-slate-900">{action.target_entity_id || 'CSR_ALPHA_01'}</strong>
              </span>
            </div>

            <p className="text-slate-700 text-xs leading-relaxed">
              <strong className="text-slate-900">Justification:</strong> {action.justification}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block font-semibold">Calculated Blast Radius:</span>
                <span className="text-slate-900 font-mono mt-0.5 block">{action.blast_radius}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Automated Rollback Procedure:</span>
                <span className="text-slate-900 font-mono mt-0.5 block">{action.rollback_procedure}</span>
              </div>
            </div>
          </div>

          {/* RBAC Notice if user role isn't operator */}
          {!isOperator && isPending && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Your current role does not have <code className="font-mono bg-purple-100 px-1 rounded">APPROVE_CHANGE</code> permission. Select <strong>Human Gate (HITL)</strong> in the top bar to approve.
              </span>
            </div>
          )}

          {/* Operator Sign-off Controls */}
          {isPending && isOperator && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>Authorized Sign-off (Caller: lead_operator_sarah)</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Mandatory Audit Comment:
                </label>
                <input
                  type="text"
                  value={operatorComment}
                  onChange={(e) => setOperatorComment(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200 font-medium"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleApproveClick}
                  disabled={isApproving}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all disabled:bg-emerald-400"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isApproving ? 'Executing Reroute...' : 'Authorize & Execute Production Reroute'}
                </button>
                <button
                  onClick={onReject}
                  className="py-2.5 px-4 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Approved Success Banner */}
          {isApproved && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 font-medium">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-emerald-950">Production Reroute Completed &amp; Active!</strong>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Traffic diverted to standby microwave link (LINK_BACKHAUL_STANDBY_09). Cell availability restored across CELL_001, CELL_002, and CELL_003. Immutable cryptographic audit log created.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, UserCheck, Lock, AlertTriangle, Key, Terminal, ArrowRight } from 'lucide-react';

export default function HitlApprovalCard({
  action,
  onApprove,
  onReject,
  role
}) {
  const [operatorComment, setOperatorComment] = useState('Reviewed deterministic bypass path; accepted reduced standby capacity to restore service.');
  const [isApproving, setIsApproving] = useState(false);

  const bypassPath = action?.bypass_path || null;
  const capacity = bypassPath?.capacity || null;
  const capacityConstrained = capacity?.sufficient_for_full_load === false;
  const pathChecks = bypassPath?.checks || [];
  const passedPathChecks = pathChecks.filter((check) => check.passed).length;

  const isApproved = action?.status === 'APPROVED' || action?.status === 'EXECUTED';
  const isRejected = action?.status === 'REJECTED';
  const isPending = action?.status === 'PENDING_APPROVAL';
  const isOperator = role === 'human_operator';

  async function handleApproveClick() {
    setIsApproving(true);
    try {
      await onApprove(operatorComment);
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="clean-card p-5 border border-slate-800/80 bg-slate-900/80 shadow-2xl rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Human-in-the-Loop (HITL) Production Governance Gate
            </h2>
            <p className="text-xs text-slate-400">
              Only authorized Tier-2 NOC leads can approve and dispatch mutations to production network hardware.
            </p>
          </div>
        </div>

        {action ? (
          <span
            className={`text-xs font-mono px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
              isApproved
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : isRejected
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                : 'bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse'
            }`}
          >
            {action.status}
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
            Awaiting Staged Proposal
          </span>
        )}
      </div>

      {/* Main Body */}
      {!action ? (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 text-slate-500 space-y-2">
          <UserCheck className="w-12 h-12 text-slate-600" />
          <h3 className="font-bold text-slate-300 text-sm">No Action Pending Sign-Off</h3>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            Autonomous AI agents are restricted to read-only diagnostics and staging. Run an investigation from the Alarm Triage workspace to stage a remediation proposal.
          </p>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Action Header Card */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300 text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40">
                  {action.action_id}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 font-mono font-semibold">
                  {action.action_type}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Target: <strong className="text-white font-mono">{action.target_entity_id || 'CSR_ALPHA_01'}</strong>
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              <strong className="text-white">Justification:</strong> {action.justification}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Calculated Blast Radius:</span>
                <span className="text-cyan-300 font-mono block">{action.blast_radius}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Automated Rollback Procedure:</span>
                <span className="text-rose-300 font-mono block">{action.rollback_procedure}</span>
              </div>
            </div>

            {bypassPath && (
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 space-y-1.5 font-mono text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-cyan-900/60">
                  <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Deterministic Bypass Resolution
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    bypassPath.feasible
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                  }`}>
                    {bypassPath.feasible ? 'PATH VERIFIED' : 'NO CONNECTED PATH'}
                  </span>
                </div>

                {bypassPath.path?.length > 0 && (
                  <div className="text-cyan-200">
                    <span className="text-slate-400">Path: </span>
                    {bypassPath.path.join(' → ')}
                  </div>
                )}
                {pathChecks.length > 0 && (
                  <div className={passedPathChecks === pathChecks.length ? 'text-emerald-300' : 'text-amber-300'}>
                    <span className="text-slate-400">Rule checks: </span>
                    {passedPathChecks}/{pathChecks.length} passed
                  </div>
                )}
                {capacity && (
                  <div className={capacityConstrained ? 'text-amber-300' : 'text-emerald-300'}>
                    <span className="text-slate-400">Capacity: </span>
                    {capacity.summary}
                  </div>
                )}
                <div className="pt-1 text-[10px] leading-snug text-slate-500">
                  {bypassPath.selection_rule}
                </div>
              </div>
            )}
          </div>

          {/* RBAC Notice if user role isn't operator */}
          {!isOperator && isPending && (
            <div className="p-3 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Your current role does not have <code className="font-mono bg-purple-900/80 px-1.5 py-0.5 rounded text-purple-200 font-semibold border border-purple-700">APPROVE_CHANGE</code> permission. Select <strong>Human Gate (HITL)</strong> in the top bar to approve.
              </span>
            </div>
          )}

          {/* Operator Sign-off Controls */}
          {isPending && isOperator && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Authorized Sign-off · Human Operator (HITL)</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                  Mandatory Audit Comment:
                </label>
                <input
                  type="text"
                  value={operatorComment}
                  onChange={(e) => setOperatorComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleApproveClick}
                  disabled={isApproving}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:bg-emerald-900/50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isApproving ? 'Executing Reroute on Production...' : 'Authorize & Execute Production Reroute'}
                </button>
                <button
                  onClick={onReject}
                  className="py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-rose-300 border border-slate-700 hover:border-rose-500/40 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Approved Success Banner */}
          {isApproved && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3 font-medium shadow-xl">
              <div className="w-8 h-8 rounded-full bg-emerald-900/80 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/40">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-emerald-300">Production Reroute Completed &amp; Active!</strong>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Traffic diverted to standby link {bypassPath?.standby?.id || 'resolved by the topology engine'}.
                  Cell availability restored across the affected cells. Immutable cryptographic audit log created.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

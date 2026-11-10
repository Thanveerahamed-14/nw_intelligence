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
    <div className="cyber-panel hud-corner hud-corner-warning p-5 border border-amber-500/30 bg-cyber-card/90 flex flex-col h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
            HITL Governance // Production Gate
          </h2>
        </div>
        {action ? (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isApproved
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                : isRejected
                ? 'bg-rose-950/80 text-rose-400 border border-rose-500/50'
                : 'bg-amber-950/80 text-amber-400 border border-amber-500/50 animate-pulse'
            }`}
          >
            {action.status}
          </span>
        ) : (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-slate-500 border border-slate-800">
            AWAITING_STAGED_PROPOSAL
          </span>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
        {!action ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <UserCheck className="w-10 h-10 text-amber-500/30 mb-2" />
            <p className="font-bold font-mono text-slate-300 text-sm uppercase tracking-wider">
              NO ACTION PENDING HUMAN SIGN-OFF
            </p>
            <p className="text-xs font-mono text-slate-500 max-w-sm mt-1 leading-relaxed">
              Production network mutations require explicit Human-in-the-Loop authorization. When the agent completes root-cause diagnosis, the reroute plan will stage here.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded bg-black/80 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-xs">
                ACTION_ID: {action.action_id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {action.action_type}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              <strong className="text-white font-mono">JUSTIFICATION:</strong> {action.justification}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] bg-cyber-void p-2 rounded border border-slate-800">
              <div>
                <span className="text-slate-500 block uppercase">Blast Radius:</span>
                <span className="text-cyan-300 font-bold">{action.blast_radius}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Rollback Procedure:</span>
                <span className="text-amber-300 font-bold">{action.rollback_procedure}</span>
              </div>
            </div>

            {/* RBAC Notice */}
            {!isOperator && isPending && (
              <div className="p-2 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[10.5px] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>RBAC Security: Switch active role to <strong>HUMAN_OPERATOR</strong> in the top header to authorize this change.</span>
              </div>
            )}

            {/* Action Buttons */}
            {isPending && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={onApprove}
                  className="flex-1 py-2 px-3 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,157,0.3)] hover:shadow-[0_0_20px_rgba(0,255,157,0.5)] active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  SIGN &amp; EXECUTE REROUTE
                </button>
                <button
                  onClick={onReject}
                  className="py-2 px-3 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1 border border-rose-500/40 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4 text-rose-400" /> REJECT
                </button>
              </div>
            )}

            {isApproved && (
              <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-[11px] shadow-[0_0_10px_rgba(0,255,157,0.2)]">
                <strong className="text-white">EXECUTION CONFIRMED:</strong> {action.execution_result}
                <div className="text-[10px] text-emerald-400/80 mt-0.5">
                  Audited by lead_operator_sarah • Cryptographic hash logged to immutable provenance store.
                </div>
              </div>
            )}

            {isRejected && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[11px]">
                <strong className="text-white">CHANGE REJECTED:</strong> Rollback executed. Incident reverted to manual triage.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

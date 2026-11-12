import React from 'react';
import { Bot, Terminal, CheckCircle2, Clock, Cpu, Zap, ArrowRight, ShieldCheck, Database, Network, Activity, Wrench, AlertTriangle } from 'lucide-react';
import AiEngineBadge from './AiEngineBadge';
import FormattedMarkdownBlock from './MarkdownText';

export default function AgentTraceConsole({ report, isInvestigating, onTrigger }) {
  // Helper to render observations in a human-friendly structured manner
  function renderStructuredObservation(step) {
    const obs = step.observation;
    if (!obs) return null;

    if (step.step_number === 1) {
      // Neighborhood discovery
      const nodes = obs.nodes || [];
      return (
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-slate-300">
            Identified {nodes.length} connected network entities:
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {nodes.map((n, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700/80 text-cyan-300 font-mono text-[11px]">
                {n.id} ({n.type})
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (step.step_number === 2) {
      // Shared dependencies
      const shared = Array.isArray(obs) ? obs : (obs.shared_dependencies || obs.shared_entities || []);
      return (
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-slate-300">
            Correlated {shared.length} shared upstream dependencies:
          </div>
          <div className="space-y-1 pt-1">
            {shared.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
                <span className="font-bold font-mono text-amber-300">{s.id} ({s.name})</span>
                <span className="text-[11px] font-medium text-amber-400/80">{s.vendor} • {s.entity_type}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (step.step_number === 3) {
      // KPI comparison — derived from the KPI records collected by the tool.
      const records = Object.values(obs || {}).flat().filter((r) => r && typeof r === 'object');
      const numeric = (name) => records
        .filter((r) => r.kpi_name === name)
        .map((r) => Number(r.value))
        .filter(Number.isFinite);
      const availabilities = numeric('CELL_AVAILABILITY');
      const losses = numeric('TRANSPORT_PACKET_LOSS');
      const minAvailability = availabilities.length ? Math.min(...availabilities) : null;
      const maxLoss = losses.length ? Math.max(...losses) : null;
      const fmt = (v) => (v == null ? 'n/a' : `${v.toFixed(2)}%`);

      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200">
            <span className="block text-[10px] font-bold uppercase text-rose-400">Cell Availability</span>
            <span className="text-base font-bold font-mono text-rose-300">{fmt(minAvailability)}</span>
            <span className="text-[11px] text-rose-400/80 block">
              {availabilities.length} sampled value(s) · 90% threshold
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200">
            <span className="block text-[10px] font-bold uppercase text-amber-400">Transport Packet Loss</span>
            <span className="text-base font-bold font-mono text-amber-300">{fmt(maxLoss)}</span>
            <span className="text-[11px] text-amber-400/80 block">
              {losses.length} sampled value(s) · 5% threshold
            </span>
          </div>
        </div>
      );
    }

    if (step.step_number === 4) {
      // Data quality — summarised from the per-entity verdicts returned by the tool.
      const entries = Object.values(obs || {}).filter((v) => v && typeof v === 'object');
      const genuine = entries.filter((v) => v.verdict === 'GENUINE_NETWORK_PROBLEM').length;
      const uncertain = entries.filter((v) => v.verdict === 'DATA_GAP_OR_UNCERTAINTY' || v.verdict === 'NO_DATA').length;
      const verdict = genuine > 0 ? 'GENUINE_NETWORK_PROBLEM' : (entries[0]?.verdict || 'UNKNOWN');
      return (
        <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span className="text-emerald-300">Data Integrity Verdict:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[10px]">
              {verdict}
            </span>
          </div>
          <p className="text-[11px] text-emerald-300/80">
            {genuine} of {entries.length} assessed entities confirmed as a genuine network problem
            {uncertain > 0 ? `; ${uncertain} show telemetry gaps or no data` : ''}.
          </p>
        </div>
      );
    }

    if (step.step_number === 5) {
      // AI Synthesis & staged action
      let diagnosisText = obs.diagnosis || '';
      let recommendationText = obs.recommendation || '';

      if (!diagnosisText && obs.root_cause) {
        // Parse from raw root_cause string if not already separated
        const clean = obs.root_cause
          .replace(/^(?:Here is (?:the|a)\s+[^:\n]+:?\s*(?:---\s*)?)/i, '')
          .replace(/^---\s*/g, '')
          .trim();

        // Split on header markers
        const parts = clean.split(/(?=###?\s*(?:1\.|2\.|Root Cause|Safe Remediation))/i);
        if (parts.length > 1) {
          diagnosisText = parts[0];
          recommendationText = parts.slice(1).join('\n');
        } else {
          diagnosisText = clean;
        }
      }

      return (
        <div className="space-y-2.5 text-xs">
          {/* Card 1: Root Cause Diagnosis */}
          {diagnosisText && (
            <div className="ai-response-card ai-diagnosis">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-rose-300 flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  1. Root Cause Diagnosis
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
                  CRITICAL FAULT IDENTIFIED
                </span>
              </div>
              <FormattedMarkdownBlock text={diagnosisText} />
            </div>
          )}

          {/* Card 2: Safe Remediation Recommendation */}
          {recommendationText && (
            <div className="ai-response-card ai-remediation">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
                  <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                  2. Safe Remediation Recommendation
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                  REMEDIATION STAGED
                </span>
              </div>
              <FormattedMarkdownBlock text={recommendationText} />
            </div>
          )}

          {/* Staged Action Pill */}
          {obs.staged_action && (
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>
                  <strong className="font-bold text-amber-300">Staged Production Action:</strong>{' '}
                  <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-300 text-[11px] font-semibold">
                    {obs.staged_action.action_type}
                  </code>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                {obs.staged_action.status}
              </span>
            </div>
          )}

          {/* AI Engine Badge — reflects the real call outcome, including failures */}
          <AiEngineBadge
            status={obs.ai_engine?.status}
            model={obs.ai_engine?.model}
            attempts={obs.ai_engine?.attempts}
            fallbackReason={obs.ai_engine?.fallback_reason}
            engineUsed={obs.engine_used}
          />
        </div>
      );
    }

    // Default fallback
    return (
      <div className="p-2 rounded bg-slate-950 text-[11px] text-slate-300 font-mono overflow-x-auto border border-slate-800">
        {typeof obs === 'object' ? JSON.stringify(obs, null, 2) : String(obs)}
      </div>
    );
  }

  return (
    <div className="clean-card p-5 border border-slate-800/80 bg-slate-900/80 shadow-2xl flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            Alarm Management Agent: Execution Trace
          </h2>
        </div>
        <div>
          {report ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-emerald-400" /> {report.total_duration_ms} ms (SLA &lt; 30s)
            </span>
          ) : isInvestigating ? (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/30 animate-pulse">
              Running Investigation...
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Agent Idle
            </span>
          )}
        </div>
      </div>

      {/* Trace Log Body */}
      <div className="flex-1 bg-[#080d1a] rounded-xl border border-slate-800/90 p-3.5 overflow-y-auto space-y-3 font-sans text-xs shadow-inner">
        {!report && !isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <Terminal className="w-10 h-10 text-slate-600 mb-3" />
            <p className="font-semibold text-slate-200 text-sm">Autonomous Agent Ready</p>
            <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
              At 10:05 UTC, multiple cells reported availability drops. Click below to launch the role-governed investigation workflow.
            </p>
            <button
              onClick={onTrigger}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Launch 10:05 UTC Investigation
            </button>
          </div>
        )}

        {isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-blue-400">
            <Cpu className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
            <p className="font-semibold text-sm text-slate-200">Executing multi-hop graph traversal &amp; telemetry correlation...</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">Guaranteed &lt; 30-second target</p>
          </div>
        )}

        {report && (
          <>
            {/* Step-by-Step Structured Cards */}
            {report.execution_steps.map((step) => {
              const isDeterministic = step.phase_type === 'DETERMINISTIC_TOOL';
              return (
                <div
                  key={step.step_number}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-md space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold border border-slate-700">
                        {step.step_number}
                      </span>
                      {step.step_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                        isDeterministic
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                          : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {step.phase_type} ({step.duration_ms} ms)
                    </span>
                  </div>

                  {step.tool_invoked && (
                    <div className="text-slate-400 text-[11px] font-mono">
                      Tool Invoked: <code className="text-cyan-400 font-semibold">{step.tool_invoked}</code>
                    </div>
                  )}

                  {renderStructuredObservation(step)}
                </div>
              );
            })}

            {/* Root Cause Conclusion Box */}
            <div className="ai-conclusion">
              <div className="flex items-center justify-between font-bold text-xs text-emerald-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Synthesized Incident Conclusion:</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                  report.sla_target_met
                    ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-900/60 text-amber-300 border-amber-500/40'
                }`}>
                  {report.sla_target_met ? 'SLA TARGET MET' : 'SLA TARGET MISSED'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-emerald-500/30">
                <FormattedMarkdownBlock text={report.root_cause_summary} />
              </div>
              {report.recommended_action ? (
                <div className="text-[11px] text-emerald-300 pt-1 font-semibold flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Remediation staged: {report.recommended_action.action_type} on{' '}
                    {report.recommended_action.target_entity_id} (Awaiting Human Operator Sign-off)
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 pt-1 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>No production change staged — decision gate declined remediation.</span>
                </div>
              )}
            </div>

            {/* Top-level AI outcome banner, so a fallback is never hidden inside step 5 */}
            <AiEngineBadge
              status={report.ai_engine?.status}
              model={report.ai_engine?.model}
              attempts={report.ai_engine?.attempts}
              fallbackReason={report.ai_engine?.fallback_reason}
              engineUsed={report.ai_engine?.engine_used}
            />
          </>
        )}
      </div>
    </div>
  );
}

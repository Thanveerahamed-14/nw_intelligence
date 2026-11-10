import React from 'react';
import { Bot, Terminal, CheckCircle2, Clock, Cpu, Zap, ArrowRight, ShieldCheck, Database, Network } from 'lucide-react';

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
          <div className="font-semibold text-slate-800">
            Identified {nodes.length} connected network entities:
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {nodes.map((n, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">
                {n.id} ({n.type})
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (step.step_number === 2) {
      // Shared dependencies
      const shared = Array.isArray(obs) ? obs : obs.shared_entities || [];
      return (
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-slate-800">
            Correlated {shared.length} shared upstream dependencies:
          </div>
          <div className="space-y-1 pt-1">
            {shared.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-amber-50/60 border border-amber-200/80 text-amber-900 text-xs">
                <span className="font-bold font-mono">{s.id} ({s.name})</span>
                <span className="text-[11px] font-medium">{s.vendor} • {s.entity_type}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (step.step_number === 3) {
      // KPI comparison
      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">
            <span className="block text-[10px] font-bold uppercase text-rose-600">Cell Availability</span>
            <span className="text-base font-bold font-mono">0.0%</span>
            <span className="text-[11px] text-rose-600 block">Collapsed from 100% nominal</span>
          </div>
          <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
            <span className="block text-[10px] font-bold uppercase text-amber-600">Router Backhaul Loss</span>
            <span className="text-base font-bold font-mono">94.2%</span>
            <span className="text-[11px] text-amber-600 block">Interface packet discards</span>
          </div>
        </div>
      );
    }

    if (step.step_number === 4) {
      // Data quality
      return (
        <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span>Data Integrity Verdict:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px]">
              {obs.verdict || 'GENUINE_NETWORK_PROBLEM'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700">
            Completeness score: <strong>100%</strong> ({obs.sample_count || 3} of {obs.expected_samples || 3} counter samples present). Confirmed physical issue, not a telemetry gap.
          </p>
        </div>
      );
    }

    if (step.step_number === 5) {
      // AI Synthesis & staged action
      return (
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed font-medium">
            {obs.root_cause}
          </div>
          {obs.staged_action && (
            <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold">Staged Action:</span> {obs.staged_action.action_type}
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                {obs.staged_action.status}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Default fallback
    return (
      <div className="p-2 rounded bg-slate-50 text-[11px] text-slate-700 font-mono overflow-x-auto">
        {typeof obs === 'object' ? JSON.stringify(obs, null, 2) : String(obs)}
      </div>
    );
  }

  return (
    <div className="clean-card p-5 border border-slate-200 bg-white shadow-sm flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Alarm Management Agent: Execution Trace
          </h2>
        </div>
        <div>
          {report ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-emerald-600" /> {report.total_duration_ms} ms (SLA &lt; 30s)
            </span>
          ) : isInvestigating ? (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
              Running Investigation...
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Agent Idle
            </span>
          )}
        </div>
      </div>

      {/* Trace Log Body */}
      <div className="flex-1 bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
        {!report && !isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
            <Terminal className="w-10 h-10 text-slate-400 mb-3" />
            <p className="font-semibold text-slate-800 text-sm">Autonomous Agent Ready</p>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              At 10:05 UTC, multiple cells reported availability drops. Click below to launch the role-governed investigation workflow.
            </p>
            <button
              onClick={onTrigger}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Launch 10:05 UTC Investigation
            </button>
          </div>
        )}

        {isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-blue-600">
            <Cpu className="w-8 h-8 animate-spin mb-3 text-blue-600" />
            <p className="font-semibold text-sm text-slate-800">Executing multi-hop graph traversal &amp; telemetry correlation...</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">Guaranteed &lt; 30-second target</p>
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
                  className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                        {step.step_number}
                      </span>
                      {step.step_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                        isDeterministic
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {step.phase_type} ({step.duration_ms} ms)
                    </span>
                  </div>

                  {step.tool_invoked && (
                    <div className="text-slate-500 text-[11px] font-mono">
                      Tool Invoked: <code className="text-blue-600 font-semibold">{step.tool_invoked}</code>
                    </div>
                  )}

                  {renderStructuredObservation(step)}
                </div>
              );
            })}

            {/* Root Cause Conclusion Box */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Root Cause Diagnosis:
              </div>
              <p className="text-xs leading-relaxed text-slate-800 font-medium">
                {report.root_cause_summary}
              </p>
              <div className="text-[11px] text-emerald-800 pt-1 font-semibold flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                Remediation Proposed: Switch traffic to Standby Microwave Link (Awaiting Human Operator Sign-off)
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Bot, Terminal, CheckCircle2, AlertCircle, Clock, Cpu, ShieldAlert } from 'lucide-react';

export default function AgentTraceConsole({ report, isInvestigating, onTrigger }) {
  return (
    <div className="glass-panel p-5 border border-slate-800 flex flex-col h-[450px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            Alarm Management Agent: Investigation Trace
          </h2>
        </div>
        <div>
          {report ? (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {report.total_duration_ms} ms (Target &lt; 30s)
            </span>
          ) : isInvestigating ? (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
              Running Investigation...
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Ready to Dispatch
            </span>
          )}
        </div>
      </div>

      {/* Trace Log Body */}
      <div className="flex-1 bg-slate-950/90 rounded-xl border border-slate-900 p-3.5 overflow-y-auto space-y-3 font-mono text-xs">
        {!report && !isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <Terminal className="w-10 h-10 text-slate-600 mb-3" />
            <p className="font-semibold text-slate-300 text-sm">Autonomous Agent Ready</p>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              At 10:05 UTC, multiple cells reported availability drops. Click the button below to launch the role-governed investigation workflow.
            </p>
            <button
              onClick={onTrigger}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-sans font-semibold shadow-lg transition-all"
            >
              ⚡ Launch 10:05 UTC Investigation
            </button>
          </div>
        )}

        {isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-blue-400">
            <Cpu className="w-8 h-8 animate-spin mb-3" />
            <p className="font-semibold text-sm">Agent executing multi-hop graph traversal &amp; telemetry analysis...</p>
            <p className="text-xs text-slate-400 mt-1">SLA: Sub-30-second target</p>
          </div>
        )}

        {report && (
          <>
            {report.execution_steps.map((step) => {
              const isDeterministic = step.phase_type === 'DETERMINISTIC_TOOL';
              return (
                <div
                  key={step.step_number}
                  className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      Step {step.step_number}: {step.step_name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        isDeterministic
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {step.phase_type} ({step.duration_ms} ms)
                    </span>
                  </div>

                  {step.tool_invoked && (
                    <div className="text-slate-400 text-[11px]">
                      Tool: <code className="text-blue-400">{step.tool_invoked}</code>
                    </div>
                  )}

                  <div className="p-2 rounded bg-black/40 text-[11px] text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {typeof step.observation === 'object'
                      ? JSON.stringify(step.observation, null, 2)
                      : String(step.observation)}
                  </div>
                </div>
              );
            })}

            {/* Root Cause Conclusion Box */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Root Cause Diagnosis:
              </div>
              <p className="text-[11px] font-sans leading-relaxed text-slate-200">
                {report.root_cause_summary}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


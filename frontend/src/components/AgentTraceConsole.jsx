import React from 'react';
import { Bot, Terminal, CheckCircle2, Clock, Cpu, ShieldAlert, Crosshair, Zap } from 'lucide-react';

export default function AgentTraceConsole({ report, isInvestigating, onTrigger }) {
  return (
    <div className="cyber-panel hud-corner p-5 border border-purple-500/30 bg-cyber-card/90 flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
            Autonomous Agent // Trace Stream
          </h2>
        </div>
        <div>
          {report ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
              <Clock className="w-3 h-3" /> LATENCY: {report.total_duration_ms} ms (SLA &lt; 30s)
            </span>
          ) : isInvestigating ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-500/40 animate-pulse">
              RUNNING_INVESTIGATION_CYCLE...
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-cyan-400 border border-slate-700">
              AGENT_IDLE // STANDBY
            </span>
          )}
        </div>
      </div>

      {/* Trace Log Terminal Window */}
      <div className="flex-1 bg-black/90 rounded border border-purple-500/20 p-3.5 overflow-y-auto space-y-3 font-mono text-xs shadow-inner">
        {!report && !isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <Terminal className="w-10 h-10 text-cyan-500/40 mb-3" />
            <p className="font-bold font-mono text-cyan-300 text-sm uppercase tracking-wider">
              AGENT SUBSYSTEM READY
            </p>
            <p className="text-xs font-mono text-slate-400 max-w-md mt-1 leading-relaxed">
              At 10:05 UTC, alarms tripped across cells 001-003. Click below to execute the 5-step deterministic + LLM forensic investigation.
            </p>
            <button
              onClick={onTrigger}
              className="mt-4 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 rounded font-mono text-xs uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all active:scale-95 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              EXECUTE 10:05 ROOT CAUSE AUDIT
            </button>
          </div>
        )}

        {isInvestigating && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-cyan-400">
            <Cpu className="w-10 h-10 animate-spin mb-3 text-cyan-400" />
            <p className="font-bold font-mono text-sm uppercase tracking-widest text-glow-cyan">
              ANALYZING GRAPH &amp; TELEMETRY STREAMS...
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1">Executing bounded 2-hop BFS &amp; Sliding Watermarks</p>
          </div>
        )}

        {report && (
          <>
            {report.execution_steps.map((step) => {
              const isDeterministic = step.phase_type === 'DETERMINISTIC_TOOL';
              return (
                <div
                  key={step.step_number}
                  className="p-3 rounded bg-cyber-card/90 border border-cyan-500/20 space-y-1.5 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="text-cyan-400">[{step.step_number}]</span>
                      <span>{step.step_name}</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9.5px] uppercase font-bold tracking-wider ${
                        isDeterministic
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                          : 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-[0_0_8px_rgba(176,38,255,0.2)]'
                      }`}
                    >
                      {step.phase_type} // {step.duration_ms} ms
                    </span>
                  </div>

                  {step.tool_invoked && (
                    <div className="text-[10px] text-cyan-400/80">
                      INVOKED_TOOL: <code className="text-cyan-300 font-bold">{step.tool_invoked}</code>
                    </div>
                  )}

                  <div className="p-2.5 rounded bg-black/80 text-[11px] text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap border border-slate-800 font-mono">
                    {typeof step.observation === 'object'
                      ? JSON.stringify(step.observation, null, 2)
                      : String(step.observation)}
                  </div>
                </div>
              );
            })}

            {/* Root Cause Conclusion Box */}
            <div className="p-3.5 rounded bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 space-y-1 shadow-[0_0_15px_rgba(0,255,157,0.15)]">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400 uppercase tracking-wider text-glow-emerald">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                VERIFIED ROOT CAUSE CONCLUSION:
              </div>
              <p className="text-[11px] font-mono leading-relaxed text-slate-200">
                {report.root_cause_summary}
              </p>
              <div className="text-[10px] font-mono text-cyan-300 pt-1 flex items-center justify-between">
                <span>REMEDIATION: Reroute traffic to LINK_BACKHAUL_STANDBY_09</span>
                <span className="text-amber-400">STAGED IN HITL GATE</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

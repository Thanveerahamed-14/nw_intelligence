import React, { useState, useEffect } from 'react';
import { GitFork, CheckCircle2, ArrowRight, X, ShieldCheck, Cpu, Database, Layers } from 'lucide-react';

const HIDDEN_NODES = new Set(['__start__', '__end__']);

export default function LangGraphModal({ isOpen, onClose }) {
  const [graphData, setGraphData] = useState(null);
  const [showMermaid, setShowMermaid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/investigation/graph')
        .then(res => res.json())
        .then(data => setGraphData(data))
        .catch(err => console.error('Failed to load LangGraph data', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const nodes = (graphData?.nodes || []).filter((n) => !HIDDEN_NODES.has(n));
  const edges = graphData?.edges || [];
  const routedEdges = edges.filter((e) => !HIDDEN_NODES.has(e.source) && !HIDDEN_NODES.has(e.target));
  const entryEdges = edges.filter((e) => HIDDEN_NODES.has(e.source));
  const exitEdges = edges.filter((e) => HIDDEN_NODES.has(e.target));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="clean-card w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 font-sans text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-950">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">LangGraph Agent State Machine</h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-bold font-mono">
                  {graphData?.orchestrator || 'LangGraph (StateGraph)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stateful autonomous workflow with deterministic guardrails and conditional LLM routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Graph Diagram Flow */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Compiled Graph — Nodes &amp; Edges
          </span>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
            {/* Nodes actually returned by the compiled graph */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              {nodes.length === 0 && (
                <span className="text-slate-500 font-mono text-[11px]">Loading compiled graph…</span>
              )}
              {nodes.map((node, i) => (
                <React.Fragment key={node}>
                  {i > 0 && <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />}
                  <div className={`px-3 py-1.5 rounded-lg border shadow-sm font-semibold flex items-center gap-1.5 font-mono text-[11px] ${
                    node === 'halt'
                      ? 'bg-rose-950/50 border-rose-500/30 text-rose-300'
                      : node === 'no_action'
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : node === 'synthesize_and_stage'
                          ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      node === 'halt'
                        ? 'bg-rose-400'
                        : node === 'no_action'
                          ? 'bg-slate-400'
                          : node === 'synthesize_and_stage'
                            ? 'bg-emerald-400'
                            : 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                    }`}></span>
                    {i + 1}. {node}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Conditional Routing Branch — derived from real edges */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
                ⚡ Conditional Router Decision
              </span>
              <div className="space-y-1.5">
                {routedEdges.length === 0 && (
                  <span className="text-slate-500 font-mono text-[11px]">No routed edges reported.</span>
                )}
                {routedEdges.map((edge, i) => (
                  <div
                    key={`${edge.source}-${edge.target}-${i}`}
                    className="flex items-center gap-2 text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    <span className="text-cyan-300">{edge.source}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className={
                      edge.target === 'halt'
                        ? 'text-rose-300'
                        : edge.target === 'no_action'
                          ? 'text-slate-300'
                          : edge.target === 'synthesize_and_stage'
                            ? 'text-emerald-300'
                            : 'text-slate-300'
                    }>
                      {edge.target}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Missing telemetry exits at <span className="font-mono text-rose-300">halt</span> with no mutation proposal.
                Nominal KPIs exit at <span className="font-mono text-slate-300">no_action</span>.
                Only genuine degradation with certified evidence reaches{' '}
                <span className="font-mono text-emerald-300">synthesize_and_stage</span> (RAG + LLM + HITL staging).
              </p>
            </div>

            {(entryEdges.length > 0 || exitEdges.length > 0) && (
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500">
                {entryEdges.map((e, i) => (
                  <span key={`in-${i}`}>entry: {e.source} → {e.target}</span>
                ))}
                {exitEdges.map((e, i) => (
                  <span key={`out-${i}`}>exit: {e.source} → {e.target}</span>
                ))}
              </div>
            )}
          </div>

          {graphData?.mermaid && (
            <div>
              <button
                type="button"
                onClick={() => setShowMermaid((v) => !v)}
                className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
              >
                {showMermaid ? 'Hide' : 'Show'} generated Mermaid source
              </button>
              {showMermaid && (
                <pre className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] leading-relaxed text-indigo-200 overflow-x-auto font-mono">
                  {graphData.mermaid}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* State Schema Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" /> LangGraph Checkpointing
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Configured with <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800 font-mono">InMemorySaver</code>. Every investigation node produces an immutable state snapshot for repeatable incident reproduction and time-travel replay.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Deterministic Safeguards
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Steps 1 through 4 are 100% deterministic code. The foundation model is only called at Step 5 when evidence is certified, completely eliminating hallucinated network mutations.
            </p>
          </div>
        </div>

        {Array.isArray(graphData?.state_schema) && graphData.state_schema.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Graph State Schema
            </span>
            <div className="flex flex-wrap gap-1.5">
              {graphData.state_schema.map((key) => (
                <span
                  key={key}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

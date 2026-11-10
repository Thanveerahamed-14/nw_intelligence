import React, { useState, useEffect } from 'react';
import { GitFork, CheckCircle2, ArrowRight, X, ShieldCheck, Cpu, Database, Layers } from 'lucide-react';

export default function LangGraphModal({ isOpen, onClose }) {
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/investigation/graph')
        .then(res => res.json())
        .then(data => setGraphData(data))
        .catch(err => console.error('Failed to load LangGraph data', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="clean-card w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 font-sans text-slate-100">
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
                  StateGraph (Compiled)
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
            Execution Pipeline &amp; Routing Guardrails
          </span>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
            {/* Sequential Steps */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 shadow-sm font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                1. Topology Discovery
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 shadow-sm font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                2. Shared Dependencies
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 shadow-sm font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                3. KPI Extraction
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 shadow-sm font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                4. Evidence Integrity Check
              </div>
            </div>

            {/* Conditional Routing Branch */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
                ⚡ Conditional Router Decision
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300">
                  <span className="block font-bold font-mono">Route: halt</span>
                  <span className="text-[11px] block mt-0.5 text-rose-200/80">Missing data / uncertainty. Exits safely with zero mutation proposal.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <span className="block font-bold font-mono">Route: no_action</span>
                  <span className="text-[11px] block mt-0.5 text-slate-400">KPIs healthy &gt; 95%. No action needed.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                  <span className="block font-bold font-mono">Route: synthesize_and_stage</span>
                  <span className="text-[11px] block mt-0.5 text-emerald-200/80">Genuine outage + 100% data. Executes RAG + AI reasoning and stages reroute in HITL gate.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* State Schema Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-white block flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" /> LangGraph Checkpointing
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Configured with <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800 font-mono">InMemorySaver</code>. Every investigation node produces an immutable state snapshot for repeatable incident reproduction and time-travel replay.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-white block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Deterministic Safeguards
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Steps 1 through 4 are 100% deterministic code. The foundation model is only called at Step 5 when evidence is certified, completely eliminating hallucinated network mutations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


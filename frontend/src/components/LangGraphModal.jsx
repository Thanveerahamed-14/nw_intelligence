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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="clean-card w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">LangGraph Agent State Machine</h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                  StateGraph (Compiled)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Stateful autonomous workflow with deterministic guardrails and conditional LLM routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Graph Diagram Flow */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Execution Pipeline &amp; Routing Guardrails
          </span>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            {/* Sequential Steps */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                1. Topology Discovery
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                2. Shared Dependencies
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                3. KPI Extraction
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                4. Evidence Integrity Check
              </div>
            </div>

            {/* Conditional Routing Branch */}
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                ⚡ Conditional Router Decision
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  <span className="block font-bold">Route: halt</span>
                  <span className="text-[11px] block mt-0.5">Missing data / uncertainty. Exits safely with zero mutation proposal.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                  <span className="block font-bold">Route: no_action</span>
                  <span className="text-[11px] block mt-0.5">KPIs healthy &gt; 95%. No action needed.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <span className="block font-bold">Route: synthesize_and_stage</span>
                  <span className="text-[11px] block mt-0.5">Genuine outage + 100% data. Executes RAG + Gemini LLM and stages reroute in HITL gate.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* State Schema Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-indigo-600" /> LangGraph Checkpointing
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Configured with <code>InMemorySaver</code>. Every investigation node produces an immutable state snapshot for repeatable incident reproduction and time-travel replay.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Deterministic Safeguards
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Steps 1 through 4 are 100% deterministic code. The LLM is only called at Step 5 when evidence is certified, completely eliminating hallucinated network mutations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

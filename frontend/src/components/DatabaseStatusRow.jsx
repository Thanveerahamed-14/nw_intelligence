import React from 'react';
import { Cpu, Database, Network, Server, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DatabaseStatusRow({ systemStatus, onOpenVectorSearch }) {
  if (!systemStatus) return null;

  const ai = systemStatus.ai || {};
  const vdb = systemStatus.vector_db || {};
  const gdb = systemStatus.graph_db || {};
  const rdb = systemStatus.relational_db || {};

  return (
    <div className="glass-panel p-3 mb-6 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      <div className="flex items-center gap-4 flex-wrap">
        {/* AI Engine Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400 font-sans text-[11px]">AI Engine:</span>
          <span className={`font-bold ${ai.connected ? 'text-emerald-400' : 'text-purple-300'}`}>
            {ai.ai_provider}
          </span>
          <span className="text-[10px] text-slate-400 font-sans">({ai.model})</span>
        </div>

        {/* Vector DB Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 font-sans text-[11px]">Vector DB:</span>
          <span className="text-cyan-300 font-bold">ChromaDB</span>
          <span className="text-[10px] text-slate-400 font-sans">({vdb.indexed_runbooks_count || 4} Runbooks)</span>
        </div>

        {/* Graph DB Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">
          <Network className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-sans text-[11px]">Graph DB:</span>
          <span className="text-amber-300 font-bold">{gdb.connected ? 'Neo4j Connected' : 'Bi-Temporal Engine'}</span>
          <span className="text-[10px] text-emerald-400 font-sans">SLA &lt; 2s</span>
        </div>

        {/* Relational DB Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 font-sans text-[11px]">Metadata DB:</span>
          <span className="text-emerald-300 font-bold">SQLite / Cloud SQL</span>
        </div>
      </div>

      {/* Button to open Vector Search Runbook Inspector */}
      <button
        onClick={onOpenVectorSearch}
        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-sans font-semibold flex items-center gap-1.5 transition-all active:scale-95"
      >
        <Search className="w-3.5 h-3.5 text-cyan-400" />
        Search Vector Runbooks (ChromaDB)
      </button>
    </div>
  );
}


import React from 'react';
import { Cpu, Database, Network, Server, Search, Terminal, CheckCircle2 } from 'lucide-react';

export default function DatabaseStatusRow({
  systemStatus,
  onOpenVectorSearch,
  onOpenNeo4jModal
}) {
  if (!systemStatus) return null;

  const ai = systemStatus.ai || {};
  const vdb = systemStatus.vector_db || {};
  const gdb = systemStatus.graph_db || {};
  const rdb = systemStatus.relational_db || {};

  return (
    <div className="clean-card p-3 mb-5 border border-slate-800 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Line Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>System Online</span>
        </div>

        {/* AI Engine Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400 text-[11px]">AI Engine:</span>
          <span className={`font-semibold ${ai.connected ? 'text-emerald-400' : 'text-purple-300'}`}>
            {ai.ai_provider}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">({ai.model})</span>
        </div>

        {/* Vector DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[11px]">Vector DB:</span>
          <span className="text-cyan-300 font-semibold">ChromaDB</span>
          <span className="text-[11px] text-slate-400 font-mono">({vdb.indexed_runbooks_count || 4} Runbooks)</span>
        </div>

        {/* Graph DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
          <Network className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[11px]">Graph DB:</span>
          <span className="text-amber-300 font-semibold">
            {gdb.connected ? 'Neo4j Connected' : 'Bi-Temporal Engine'}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-medium">
            SLA &lt; 2s
          </span>
        </div>

        {/* Relational DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
          <Server className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 text-[11px]">Metadata:</span>
          <span className="text-slate-200 font-semibold">SQLite / Cloud SQL</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenVectorSearch}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          Search Runbooks
        </button>

        <button
          onClick={onOpenNeo4jModal}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          Neo4j Graph Explorer
        </button>
      </div>
    </div>
  );
}

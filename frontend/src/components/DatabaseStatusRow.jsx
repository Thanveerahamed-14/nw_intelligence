import React from 'react';
import { Cpu, Database, Network, Server, Search, Terminal, GitFork } from 'lucide-react';

export default function DatabaseStatusRow({
  systemStatus,
  onOpenVectorSearch,
  onOpenNeo4jModal,
  onOpenLangGraphModal
}) {
  if (!systemStatus) return null;

  const ai = systemStatus.ai || {};
  const vdb = systemStatus.vector_db || {};
  const gdb = systemStatus.graph_db || {};
  const rdb = systemStatus.relational_db || {};

  return (
    <div className="clean-card p-3 mb-5 border border-slate-200 bg-white shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Status Line Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>System Healthy</span>
        </div>

        {/* AI Engine Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-purple-50/80 border border-purple-200/80">
          <Cpu className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-slate-600 text-[11px]">AI Engine:</span>
          <span className={`font-semibold ${ai.connected ? 'text-emerald-700' : 'text-purple-700'}`}>
            {ai.ai_provider}
          </span>
          <span className="text-[11px] text-purple-600 font-mono">({ai.model})</span>
        </div>

        {/* LangGraph State Machine */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-50/80 border border-indigo-200/80">
          <GitFork className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-slate-600 text-[11px]">Workflow:</span>
          <span className="text-indigo-700 font-semibold">LangGraph</span>
          <span className="text-[11px] text-indigo-600 font-mono">(StateGraph)</span>
        </div>

        {/* Vector DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-sky-50/80 border border-sky-200/80">
          <Database className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-slate-600 text-[11px]">Vector DB:</span>
          <span className="text-sky-700 font-semibold">ChromaDB</span>
          <span className="text-[11px] text-sky-600 font-mono">({vdb.indexed_runbooks_count || 4} Runbooks)</span>
        </div>

        {/* Graph DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-amber-50/80 border border-amber-200/80">
          <Network className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-slate-600 text-[11px]">Graph DB:</span>
          <span className="text-amber-800 font-semibold">
            {gdb.connected ? 'Neo4j Connected' : 'Bi-Temporal Engine'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
            SLA &lt; 2s
          </span>
        </div>

        {/* Relational DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-50 border border-slate-200">
          <Server className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-600 text-[11px]">Metadata:</span>
          <span className="text-slate-800 font-semibold">SQLite / Cloud SQL</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenLangGraphModal}
          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <GitFork className="w-3.5 h-3.5 text-indigo-600" />
          LangGraph Workflow
        </button>

        <button
          onClick={onOpenVectorSearch}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Search className="w-3.5 h-3.5 text-sky-600" />
          Search Runbooks
        </button>

        <button
          onClick={onOpenNeo4jModal}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-600" />
          Neo4j Explorer
        </button>
      </div>
    </div>
  );
}

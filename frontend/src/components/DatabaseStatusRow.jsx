import React from 'react';
import { Cpu, Database, Network, Server, Search, Terminal, Activity } from 'lucide-react';

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
    <div className="cyber-panel p-3 mb-5 border border-cyan-500/20 bg-cyber-card/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Line Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-slate-700 text-[10px] text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>GRID_CORE: ONLINE</span>
        </div>

        {/* AI Engine Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/70 border border-purple-500/30 shadow-[0_0_8px_rgba(176,38,255,0.15)]">
          <Cpu className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="text-slate-400 text-[11px]">AI_REASONING:</span>
          <span className={`font-bold ${ai.connected ? 'text-emerald-400 text-glow-emerald' : 'text-purple-300'}`}>
            {ai.ai_provider}
          </span>
          <span className="text-[10px] text-purple-400/70">[{ai.model}]</span>
        </div>

        {/* Vector DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/70 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.15)]">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[11px]">VECTOR_DB:</span>
          <span className="text-cyan-300 font-bold text-glow-cyan">ChromaDB</span>
          <span className="text-[10px] text-cyan-400/70">[{vdb.indexed_runbooks_count || 4} Runbooks]</span>
        </div>

        {/* Graph DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/70 border border-amber-500/30 shadow-[0_0_8px_rgba(255,170,0,0.15)]">
          <Network className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[11px]">GRAPH_DB:</span>
          <span className="text-amber-300 font-bold text-glow-amber">
            {gdb.connected ? 'Neo4j Bolt Active' : 'Bi-Temporal Engine'}
          </span>
          <span className="text-[10px] text-emerald-400">[2-Hop SLA &lt; 2s]</span>
        </div>

        {/* Relational DB Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/70 border border-emerald-500/30 shadow-[0_0_8px_rgba(0,255,157,0.15)]">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 text-[11px]">METADATA_DB:</span>
          <span className="text-emerald-300 font-bold">Cloud SQL / SQLite</span>
        </div>
      </div>

      {/* Cyber Action Triggers */}
      <div className="flex items-center gap-2">
        {/* Button to open Vector Search Runbook Inspector */}
        <button
          onClick={onOpenVectorSearch}
          className="px-3 py-1.5 rounded bg-cyan-950/80 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/50 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 uppercase tracking-wider"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          Vector Runbooks
        </button>

        {/* Button to open Neo4j Explorer / Cypher Inspector */}
        <button
          onClick={onOpenNeo4jModal}
          className="px-3 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900/60 text-amber-300 border border-amber-500/50 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(255,170,0,0.2)] hover:shadow-[0_0_15px_rgba(255,170,0,0.4)] active:scale-95 uppercase tracking-wider"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          Neo4j Cypher / Graph
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Network, Terminal, Play, CheckCircle2, AlertCircle, Copy, Clock, Layers, X, BookOpen } from 'lucide-react';

export default function Neo4jExplorerModal({ isOpen, onClose, systemStatus }) {
  const [activeTab, setActiveTab] = useState('cypher'); // 'cypher' | 'setup' | 'bitemporal'
  const [cypherQuery, setCypherQuery] = useState(
    'MATCH (c:Cell)-[:HOSTED_ON*1..2]->(r:Router)\nRETURN c.id AS Cell, r.id AS SharedRouter'
  );
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const gdb = systemStatus?.graph_db || {};
  const isConnected = gdb.connected;

  async function handleExecuteCypher(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/graph/cypher?query=${encodeURIComponent(cypherQuery)}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        setResults({ error: `Server error: ${res.status}` });
      }
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleCopyEnv() {
    navigator.clipboard.writeText(
`# In your .env file:
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_actual_password
NEO4J_DATABASE=neo4j`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="clean-card w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-4 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Neo4j Graph Database Explorer</h2>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                  }`}
                >
                  {isConnected ? '✓ Neo4j Bolt Connected' : '⚡ Bi-Temporal Engine Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-tenant graph topology, Cypher query execution, and temporal time-travel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('cypher')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'cypher'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            Cypher Console
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'setup'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Neo4j Connection Guide
          </button>
          <button
            onClick={() => setActiveTab('bitemporal')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'bitemporal'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            What is Bi-Temporal?
          </button>
        </div>

        {/* TAB 1: CYPHER CONSOLE */}
        {activeTab === 'cypher' && (
          <div className="space-y-3">
            {/* Query Presets */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-400 text-[11px]">Presets:</span>
              <button
                onClick={() =>
                  setCypherQuery('MATCH (c:Cell)-[:HOSTED_ON*1..2]->(r:Router)\nRETURN c.id AS Cell, r.id AS SharedRouter')
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 text-[11px]"
              >
                Cell-to-Router Dependency
              </button>
              <button
                onClick={() =>
                  setCypherQuery('MATCH (l:TransportLink)\nRETURN l.id, l.name, l.status, l.medium')
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 text-[11px]"
              >
                Transport Links Status
              </button>
              <button
                onClick={() =>
                  setCypherQuery('MATCH (n) RETURN labels(n)[0] AS EntityType, count(n) AS TotalCount')
                }
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 text-[11px]"
              >
                Count by Node Label
              </button>
            </div>

            {/* Cypher Input Editor */}
            <form onSubmit={handleExecuteCypher} className="space-y-2">
              <textarea
                value={cypherQuery}
                onChange={(e) => setCypherQuery(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="Write your Cypher query here..."
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">
                  Target Engine: {isConnected ? 'Live Neo4j Instance' : 'Local Bi-Temporal Graph Engine'}
                </span>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {loading ? 'Executing...' : 'Run Cypher Query'}
                </button>
              </div>
            </form>

            {/* Execution Output */}
            {results && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 max-h-56 overflow-y-auto text-xs text-slate-200">
                <div className="text-[11px] text-amber-400 font-semibold mb-1">
                  Engine: {results.engine}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-300">
                  {JSON.stringify(results.results || results, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SETUP GUIDE */}
        {activeTab === 'setup' && (
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200">
              <strong className="text-white text-sm">How to connect your local Neo4j installation:</strong>
              <p className="text-xs text-slate-300 mt-1">
                You already have Neo4j installed. Follow these 3 simple steps to connect and synchronize your graph database:
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-blue-400 font-semibold mb-1.5">
                  <span>Step 1: Configure Credentials in .env</span>
                  <button
                    onClick={handleCopyEnv}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'Copied!' : 'Copy Config'}
                  </button>
                </div>
                <pre className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono overflow-x-auto">
{`# Open .env in your project root and set:
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_actual_password`}
                </pre>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-blue-400 font-semibold mb-1">
                  Step 2: Run the Ingestion &amp; Sync Script
                </div>
                <pre className="text-xs text-emerald-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono">
python scripts/sync_to_neo4j.py
                </pre>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  This connects via Bolt, sets up uniqueness constraints, and ingests all multi-tenant nodes and relationships (Sites, gNodeBs, Cells, Routers, Links).
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-blue-400 font-semibold mb-1">
                  Step 3: Open Neo4j Browser
                </div>
                <p className="text-xs text-slate-300">
                  Open <code className="text-amber-400 font-mono">http://localhost:7474</code> in your browser and log in with your credentials to explore the graph visually!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BI-TEMPORAL EXPLANATION */}
        {activeTab === 'bitemporal' && (
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-slate-200">
              <strong className="text-white text-sm">What is Bi-Temporal Data Modeling?</strong>
              <p className="text-xs text-slate-300 mt-1">
                Standard databases only store a single timestamp (e.g. <code>updated_at</code>). When late-arriving vendor batches or out-of-order telemetry arrive, updating that record overwrites history. Bi-Temporal data modeling tracks <strong className="text-blue-300">two independent timelines</strong>:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-blue-400 font-semibold text-xs flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  1. Valid Time (Event Time)
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2">
                  [valid_from, valid_to)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The actual time an event occurred in the <strong>physical network</strong>.
                  <br />
                  <span className="text-rose-400 font-mono text-[11px] mt-1.5 block">
                    Example: Fiber microbend occurred at 10:03:00 UTC.
                  </span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-purple-400 font-semibold text-xs flex items-center gap-1.5 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  2. System Time (Transaction Time)
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2">
                  [system_from, system_to)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The time when the database <strong>recorded</strong> this fact.
                  <br />
                  <span className="text-amber-400 font-mono text-[11px] mt-1.5 block">
                    Example: Late vendor inventory batch ingested at 10:45:00 UTC.
                  </span>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <strong className="text-white">Why It Solves the 10:05 UTC Incident:</strong>
              <p className="mt-1 leading-relaxed">
                When an AI agent investigates an incident at 10:05 UTC, querying with <code className="text-blue-300 font-mono">as_of=10:05:00Z</code> reconstructs the network <strong>exactly as it existed at 10:05 UTC</strong>. Even if emergency field crews update the link at 14:00 UTC, past reality is preserved with complete mathematical auditability.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

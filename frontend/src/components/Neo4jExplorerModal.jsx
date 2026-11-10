import React, { useState } from 'react';
import { Network, Terminal, Play, CheckCircle2, AlertCircle, Copy, ExternalLink, Clock, Layers, X, HelpCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="cyber-panel hud-corner w-full max-w-3xl bg-cyber-panel border border-amber-500/50 rounded shadow-[0_0_35px_rgba(255,170,0,0.25)] p-6 space-y-4 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <Network className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
                <span>Neo4j Graph Database // Explorer</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    isConnected
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {isConnected ? '✓ NEO4J BOLT LIVE' : '⚡ BI-TEMPORAL ENGINE FALLBACK'}
                </span>
              </h2>
              <p className="text-[10.5px] text-amber-400/80">
                Multi-tenant graph topology, Cypher queries, and bi-temporal time-travel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-amber-400 hover:text-white hover:bg-amber-500/20 font-bold border border-amber-500/40"
          >
            [ESC / X]
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('cypher')}
            className={`px-3 py-1.5 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'cypher'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(255,170,0,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Cypher Console
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'setup'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(255,170,0,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Neo4j Connection Guide
          </button>
          <button
            onClick={() => setActiveTab('bitemporal')}
            className={`px-3 py-1.5 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'bitemporal'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            What is Bi-Temporal?
          </button>
        </div>

        {/* TAB 1: CYPHER CONSOLE */}
        {activeTab === 'cypher' && (
          <div className="space-y-3">
            {/* Query Presets */}
            <div className="flex items-center gap-2 text-[10px] flex-wrap">
              <span className="text-slate-400">PRESETS:</span>
              <button
                onClick={() =>
                  setCypherQuery('MATCH (c:Cell)-[:HOSTED_ON*1..2]->(r:Router)\nRETURN c.id AS Cell, r.id AS SharedRouter')
                }
                className="px-2 py-0.5 rounded bg-black/80 hover:bg-slate-800 text-amber-300 border border-slate-700"
              >
                Cell-to-Router Path
              </button>
              <button
                onClick={() =>
                  setCypherQuery('MATCH (l:TransportLink)\nRETURN l.id, l.name, l.status, l.medium')
                }
                className="px-2 py-0.5 rounded bg-black/80 hover:bg-slate-800 text-amber-300 border border-slate-700"
              >
                Transport Links Status
              </button>
              <button
                onClick={() =>
                  setCypherQuery('MATCH (n) RETURN labels(n)[0] AS EntityType, count(n) AS TotalCount')
                }
                className="px-2 py-0.5 rounded bg-black/80 hover:bg-slate-800 text-amber-300 border border-slate-700"
              >
                Entity Counts
              </button>
            </div>

            {/* Cypher Input Editor */}
            <form onSubmit={handleExecuteCypher} className="space-y-2">
              <textarea
                value={cypherQuery}
                onChange={(e) => setCypherQuery(e.target.value)}
                rows={3}
                className="w-full bg-black/90 border border-amber-500/40 rounded p-2.5 text-xs text-amber-300 font-mono outline-none focus:border-amber-400 focus:shadow-[0_0_12px_rgba(255,170,0,0.3)] resize-none"
                placeholder="Write your Cypher query here..."
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">
                  Target: {isConnected ? 'Live Neo4j Cluster' : 'Bi-Temporal Engine Emulation'}
                </span>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/60 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(255,170,0,0.2)] active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {loading ? 'EXECUTING...' : 'RUN CYPHER'}
                </button>
              </div>
            </form>

            {/* Execution Output */}
            {results && (
              <div className="p-3 bg-black/90 rounded border border-slate-800 max-h-56 overflow-y-auto text-[11px] text-slate-200">
                <div className="text-[10px] text-amber-400 font-bold mb-1.5">
                  ENGINE: {results.engine}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-cyan-300">
                  {JSON.stringify(results.results || results, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SETUP GUIDE */}
        {activeTab === 'setup' && (
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3 rounded bg-amber-950/30 border border-amber-500/30 text-amber-200">
              <strong className="text-white">Connecting your local Neo4j installation:</strong>
              <p className="text-[11px] text-amber-300/90 mt-1">
                You already have Neo4j installed! Follow these 3 simple steps to connect and synchronize your graph:
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-black/80 rounded border border-slate-800">
                <div className="flex items-center justify-between text-cyan-400 font-bold mb-1">
                  <span>STEP 1: Add Credentials to .env</span>
                  <button
                    onClick={handleCopyEnv}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'Copied!' : 'Copy Config'}
                  </button>
                </div>
                <pre className="text-[11px] text-slate-300 bg-black p-2 rounded border border-slate-900 overflow-x-auto">
{`# Open .env in your project root and fill in:
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_actual_password`}
                </pre>
              </div>

              <div className="p-3 bg-black/80 rounded border border-slate-800">
                <div className="text-cyan-400 font-bold mb-1">
                  STEP 2: Run the Automated Synchronizer
                </div>
                <pre className="text-[11px] text-emerald-400 bg-black p-2 rounded border border-slate-900">
python scripts/sync_to_neo4j.py
                </pre>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  This connects via Bolt, creates uniqueness constraints, and populates the multi-tenant topology (Sites, gNodeBs, Cells, Routers, Links).
                </p>
              </div>

              <div className="p-3 bg-black/80 rounded border border-slate-800">
                <div className="text-cyan-400 font-bold mb-1">
                  STEP 3: Open Neo4j Browser
                </div>
                <p className="text-[11px] text-slate-300">
                  Open <code className="text-amber-400">http://localhost:7474</code> in your browser and log in. You can run interactive visual graph traversals with force-directed graph styling!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BI-TEMPORAL EXPLANATION */}
        {activeTab === 'bitemporal' && (
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3 rounded bg-cyan-950/40 border border-cyan-500/40 text-cyan-200">
              <strong className="text-white text-sm">What is Bi-Temporal Data Modeling?</strong>
              <p className="text-[11px] text-slate-300 mt-1">
                Standard databases only record a single timestamp ("updated_at"). In telecom networks, that causes silent history corruption. Bi-Temporal data modeling tracks <strong className="text-cyan-300">TWO independent timelines</strong> for every node, edge, and KPI:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-black/80 rounded border border-cyan-500/30">
                <div className="text-cyan-400 font-bold text-xs uppercase flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  1. Valid Time (Event Time)
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2">
                  [valid_from, valid_to)
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  The actual time an event occurred in the <strong>physical world</strong>.
                  <br />
                  <span className="text-rose-400 font-mono text-[10px] mt-1 block">
                    Example: Fiber link microbend occurred at 10:03:00 UTC.
                  </span>
                </p>
              </div>

              <div className="p-3 bg-black/80 rounded border border-purple-500/30">
                <div className="text-purple-400 font-bold text-xs uppercase flex items-center gap-1.5 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  2. System Time (Transaction Time)
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2">
                  [system_from, system_to)
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  The time when the database <strong>recorded</strong> this fact.
                  <br />
                  <span className="text-amber-400 font-mono text-[10px] mt-1 block">
                    Example: Late-arriving inventory batch ingested at 10:45:00 UTC.
                  </span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded bg-black/90 border border-slate-800 text-[11px] text-slate-300">
              <strong className="text-white">Why It Solves the 10:05 UTC Incident:</strong>
              <p className="mt-1">
                When an AI agent or NOC engineer investigates at 10:05 UTC, they run an <code className="text-cyan-300">as_of=10:05:00Z</code> query. Even if emergency field crews update the link at 14:00 UTC, the bi-temporal engine reconstructs the exact state of the network as it existed at 10:05 without rewriting or erasing past reality.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

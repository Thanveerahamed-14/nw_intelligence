import React, { useState } from 'react';
import { Search, Database, BookOpen, X, Sparkles, Terminal } from 'lucide-react';

export default function VectorSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('optical fiber transceiver packet loss drop');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSearch(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/vector/search?query=${encodeURIComponent(query)}&top_k=3`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.runbooks || []);
      }
    } catch (err) {
      console.error('Vector search failed', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="cyber-panel hud-corner w-full max-w-2xl bg-cyber-panel border border-cyan-400/50 rounded shadow-[0_0_35px_rgba(0,240,255,0.25)] p-6 space-y-4 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                ChromaDB // Semantic Vector Search
              </h2>
              <p className="text-[10.5px] text-cyan-400/70">
                128-dim offline L2 normalized embeddings across historical RCAs &amp; vendor runbooks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 font-bold border border-cyan-500/40"
          >
            [ESC / X]
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. optical transceiver packet loss, backhaul latency spike, radio degradation..."
              className="w-full bg-black/90 border border-cyan-500/40 rounded pl-9 pr-4 py-2 text-xs text-cyan-300 outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,240,255,0.3)] font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {loading ? 'EMBEDDING...' : 'QUERY VECTORS'}
          </button>
        </form>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto space-y-3 text-xs">
          {results.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-500 border border-slate-900 rounded bg-black/60">
              Type a symptom or technical keyword to search high-dimensional vector embeddings.
            </div>
          )}

          {results.map((r, idx) => (
            <div key={idx} className="p-3.5 rounded bg-black/80 border border-cyan-500/30 space-y-1.5 shadow-[0_0_10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  {r.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  COSINE_SIMILARITY: {Math.round(r.similarity_score * 100)}%
                </span>
              </div>
              <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                {r.document}
              </p>
              {r.metadata?.recommended_action && (
                <div className="text-[10.5px] text-emerald-400 pt-1 font-mono">
                  <strong className="text-emerald-300">RECOMMENDED_PROCEDURE:</strong> {r.metadata.recommended_action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

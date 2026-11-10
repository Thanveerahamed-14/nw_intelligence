import React, { useState } from 'react';
import { Search, Database, BookOpen, X, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="clean-card w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 font-sans text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-950">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                ChromaDB Vector Runbook Search
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/30 font-mono">
                  cosine_similarity
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Semantic similarity matching across historical telecom RCAs and engineering playbooks
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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. optical transceiver packet loss, backhaul latency spike, radio degradation..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-all font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-sky-950/50 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? 'Searching...' : 'Vector Search'}
          </button>
        </form>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto space-y-3 text-xs custom-scrollbar">
          {results.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-500 border border-slate-800/80 rounded-xl bg-slate-950/60">
              Type a symptom or technical keyword to search ChromaDB vector embeddings.
            </div>
          )}

          {results.map((r, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 hover:border-sky-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 flex items-center gap-1.5 font-mono">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  {r.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-sky-950 text-sky-300 border border-sky-500/30 font-semibold font-mono">
                  Match: {Math.round(r.similarity_score * 100)}%
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {r.document}
              </p>
              {r.metadata?.recommended_action && (
                <div className="text-[11px] text-emerald-300 pt-2 border-t border-slate-800/80 font-medium">
                  <strong className="text-emerald-400">Recommended Procedure:</strong> {r.metadata.recommended_action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

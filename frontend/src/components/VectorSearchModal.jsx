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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">ChromaDB Vector Runbook Search</h2>
              <p className="text-[11px] text-slate-400">Semantic similarity search across historical RCAs and telecom vendor runbooks</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
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
              placeholder="e.g. fiber microbend, CPRI signal loss, UPF buffer congestion..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? 'Searching...' : 'Vector Search'}
          </button>
        </form>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto space-y-3 font-mono text-xs">
          {results.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-500">
              Type a symptom or error to search the ChromaDB vector embeddings.
            </div>
          )}

          {results.map((r, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  {r.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Similarity: {Math.round(r.similarity_score * 100)}%
                </span>
              </div>
              <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                {r.document}
              </p>
              {r.metadata?.recommended_action && (
                <div className="text-[10px] text-emerald-400 pt-1">
                  <strong>Recommended Action:</strong> {r.metadata.recommended_action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


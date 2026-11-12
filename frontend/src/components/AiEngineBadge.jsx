import React, { useState } from 'react';
import { Sparkles, AlertTriangle, ChevronDown, ChevronUp, MinusCircle } from 'lucide-react';

/**
 * Renders the *actual* outcome of the AI synthesis call.
 *
 * - LIVE        -> Gemini responded; show provider + model + latency, plus any
 *                  models that failed over before one answered.
 * - FALLBACK    -> every model failed; show the error and the attempted cascade.
 * - NOT_INVOKED -> the deterministic decision gate did not need an LLM.
 */
export default function AiEngineBadge({
  status,
  model,
  attempts = [],
  fallbackReason,
  engineUsed,
  className = ''
}) {
  const [expanded, setExpanded] = useState(false);

  if (!status) return null;

  const attemptList = Array.isArray(attempts) ? attempts : [];
  const success = attemptList.find((a) => a.status === 'SUCCESS');
  const failures = attemptList.filter((a) => a.status === 'FAILED' || a.status === 'SKIPPED');

  if (status === 'LIVE') {
    if (failures.length === 0) {
      return (
        <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 font-mono ${className}`}>
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>
            Gemini live via <strong className="text-emerald-300">{model || engineUsed}</strong>
            {success?.latency_ms != null && (
              <span className="text-slate-500"> · {Math.round(success.latency_ms)} ms</span>
            )}
          </span>
        </div>
      );
    }

    // A model answered, but only after one or more candidates failed over.
    return (
      <div className={`rounded-lg border border-emerald-500/30 bg-emerald-950/30 ${className}`}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 p-2 text-left"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="flex-1 text-[10px] font-mono text-slate-300">
            Gemini live via <strong className="text-emerald-300">{model || engineUsed}</strong>
            {success?.latency_ms != null && (
              <span className="text-slate-500"> · {Math.round(success.latency_ms)} ms</span>
            )}
            <span className="text-amber-300"> · {failures.length} model(s) failed over</span>
          </span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        </button>
        {expanded && (
          <div className="px-2 pb-2 space-y-1">
            {failures.map((a, i) => (
              <div
                key={`${a.model}-${i}`}
                className="flex items-center justify-between gap-2 text-[10px] font-mono px-2 py-1 rounded bg-slate-950/70 border border-amber-500/20"
              >
                <span className="text-slate-300">{a.model}</span>
                <span className="text-amber-300">
                  {a.error_type || 'ERROR'}
                  {a.http_status ? ` (${a.http_status})` : ''}
                  {a.latency_ms != null ? ` · ${Math.round(a.latency_ms)} ms` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === 'NOT_INVOKED') {
    return (
      <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 font-mono ${className}`}>
        <MinusCircle className="w-3 h-3 text-slate-500" />
        <span>Deterministic decision gate · LLM not required</span>
      </div>
    );
  }

  // FALLBACK
  return (
    <div className={`rounded-lg border border-amber-500/40 bg-amber-950/40 ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 p-2.5 text-left"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span className="flex-1 text-[11px] leading-relaxed text-amber-200">
          <strong className="block text-amber-300 font-bold">
            Gemini error — fell back to the deterministic engine
          </strong>
          <span className="block text-amber-200/80 font-mono text-[10px] break-words">
            {fallbackReason || 'All configured Gemini models failed'}
          </span>
        </span>
        {failures.length > 0 && (
          expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            : <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        )}
      </button>

      {expanded && failures.length > 0 && (
        <div className="px-2.5 pb-2.5 space-y-1">
          {failures.map((a, i) => (
            <div
              key={`${a.model}-${i}`}
              className="flex items-center justify-between gap-2 text-[10px] font-mono px-2 py-1 rounded bg-slate-950/70 border border-amber-500/20"
            >
              <span className="text-slate-300">{a.model}</span>
              <span className="text-rose-300">
                {a.error_type || 'ERROR'}
                {a.http_status ? ` (${a.http_status})` : ''}
                {a.latency_ms != null ? ` · ${Math.round(a.latency_ms)} ms` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

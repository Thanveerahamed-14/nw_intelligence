import React from 'react';
import { Activity, Zap, GitFork, Search, Terminal, AlertTriangle, LineChart, Sliders, UserCheck, Layers, CheckCircle2, XCircle, Sun, Moon, Sparkles } from 'lucide-react';

export default function Navbar({
  tenant,
  setTenant,
  theme,
  onToggleTheme,
  role,
  setRole,
  isInvestigating,
  onRunInvestigation,
  systemStatus,
  onOpenVectorSearch,
  onOpenNeo4jModal,
  onOpenLangGraphModal
}) {
  const gdb = systemStatus?.graph_db || {};
  const ai = systemStatus?.ai || {};
  const vdb = systemStatus?.vector_db || {};

  const isAiConnected = !!ai.connected;
  const lastAiCall = ai.last_call || null;
  const aiFellBack = isAiConnected && lastAiCall && lastAiCall.ai_status !== 'LIVE';
  const aiFailover = isAiConnected && lastAiCall &&
    (lastAiCall.attempts || []).some((a) => a.status === 'FAILED' || a.status === 'SKIPPED');
  const isNeo4jConnected = !!gdb.connected;
  const isVectorOnline = vdb.status === 'ONLINE';

  return (
    <nav className="app-navbar bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40 px-4 py-3 shadow-2xl mb-5">
      <div className="nav-layout max-w-[1680px] mx-auto">
        {/* Left: Brand & Incident Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight block leading-tight">
                Telecom Intelligence
              </span>
              <span className="text-[10px] text-slate-400 font-mono block leading-none mt-0.5">
                Autonomous NOC Platform &bull; SLA &lt;2s
              </span>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-500/30 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            10:05 UTC Outage
          </span>
        </div>

        {/* Center: Agent Workspace Segmented Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs font-semibold">
          <button
            onClick={() => setRole('alarm_management')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              role === 'alarm_management'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Alarm Triage</span>
            <span className="md:hidden">Alarms</span>
          </button>

          <button
            onClick={() => setRole('performance_analysis')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              role === 'performance_analysis'
                ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Performance</span>
            <span className="md:hidden">KPIs</span>
          </button>

          <button
            onClick={() => setRole('change_planning')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              role === 'change_planning'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Change Planning</span>
            <span className="md:hidden">Changes</span>
          </button>

          <button
            onClick={() => setRole('human_operator')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              role === 'human_operator'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Human Gate (HITL)</span>
            <span className="md:hidden">Approvals</span>
          </button>
        </div>

        {/* Right: Real Technology Status & Main Investigation CTA */}
        <div className="flex items-center gap-2">
          {/* Real Technology Status Badges */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px]">
            {/* LangGraph Active */}
            <button
              onClick={onOpenLangGraphModal}
              title="LangGraph State Machine active"
              className="px-2 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/50 font-semibold flex items-center gap-1.5 transition-all"
            >
              <GitFork className="w-3 h-3 text-indigo-400" />
              <span>LangGraph</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
            </button>

            {/* Gemini live / failover / fallback state */}
            <span
              title={
                aiFellBack
                  ? (lastAiCall.fallback_reason || 'Gemini unavailable — deterministic engine used')
                  : isAiConnected
                    ? aiFailover
                      ? `Google Gemini live via ${lastAiCall?.model_used || ai.model} after ${(lastAiCall?.attempts || []).filter((a) => a.status === 'FAILED' || a.status === 'SKIPPED').length} failed model(s)`
                      : `Google Gemini live (${lastAiCall?.model_used || ai.model})`
                    : 'No GEMINI_API_KEY configured — deterministic engine'
              }
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1.5 border ${
                aiFellBack
                  ? 'bg-amber-950/50 text-amber-300 border-amber-700/60'
                  : aiFailover
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60'
                    : isAiConnected
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>
                {aiFellBack
                  ? 'Gemini Fallback'
                  : isAiConnected
                    ? (aiFailover ? 'Gemini · failover' : 'Gemini')
                    : 'Deterministic'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                aiFellBack ? 'bg-amber-400' : isAiConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-500'
              }`}></span>
            </span>

            {/* ChromaDB Vector Store */}
            <button
              onClick={onOpenVectorSearch}
              title={isVectorOnline ? 'ChromaDB Local Vector Store Online' : 'Vector DB Offline'}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all border ${
                isVectorOnline
                  ? 'bg-sky-950/50 hover:bg-sky-900/50 text-sky-300 border-sky-800/50'
                  : 'bg-slate-900/60 text-slate-500 border-slate-800'
              }`}
            >
              <Search className="w-3 h-3 text-sky-400" />
              <span>ChromaDB</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isVectorOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-500'}`}></span>
            </button>

            {/* Neo4j Status */}
            <button
              onClick={onOpenNeo4jModal}
              title={
                isNeo4jConnected
                  ? 'Neo4j Bolt Connected on port 7687'
                  : 'Neo4j Offline (Bi-Temporal In-Memory Fallback Active)'
              }
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all border ${
                isNeo4jConnected
                  ? 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/50'
                  : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border-slate-700/80'
              }`}
            >
              <Terminal className="w-3 h-3 text-slate-400" />
              <span>{isNeo4jConnected ? 'Neo4j (Live)' : 'Bi-Temporal Engine'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isNeo4jConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
                }`}
              ></span>
            </button>
          </div>

          {/* Tenant Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <select
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium outline-none cursor-pointer"
            >
              <option value="customer_a" className="bg-slate-900 text-slate-200">Customer A</option>
              <option value="customer_b" className="bg-slate-900 text-slate-200">Customer B</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Current theme: ${theme}. Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Current theme: ${theme}. Click to switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="theme-toggle"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" aria-hidden="true" /> : <Sun className="w-4 h-4" aria-hidden="true" />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          {/* Main Action Trigger */}
          <button
            onClick={onRunInvestigation}
            disabled={isInvestigating}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg ${
              isInvestigating
                ? 'bg-blue-900/60 text-blue-300 cursor-not-allowed border border-blue-700/50'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-indigo-500/20 active:scale-95'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isInvestigating ? 'animate-spin text-blue-300' : 'text-amber-300'}`} />
            <span>{isInvestigating ? 'Analyzing...' : 'Investigate 10:05'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

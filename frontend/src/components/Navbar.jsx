import React from 'react';
import { Activity, ShieldCheck, Zap, GitFork, Search, Terminal, AlertTriangle, LineChart, Sliders, UserCheck, Layers } from 'lucide-react';

export default function Navbar({
  tenant,
  setTenant,
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

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2.5 shadow-xs mb-4">
      <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Brand & Incident Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block leading-tight">
                Telecom Intelligence
              </span>
              <span className="text-[10px] text-slate-400 font-mono block leading-none">
                Autonomous NOC &bull; SLA &lt;2s
              </span>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            10:05 UTC Outage
          </span>
        </div>

        {/* Center: Agent Workspace Segmented Switcher */}
        <div className="flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-semibold">
          <button
            onClick={() => setRole('alarm_management')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              role === 'alarm_management'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden md:inline">Alarm Triage</span>
            <span className="md:hidden">Alarms</span>
          </button>

          <button
            onClick={() => setRole('performance_analysis')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              role === 'performance_analysis'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Performance</span>
            <span className="md:hidden">KPIs</span>
          </button>

          <button
            onClick={() => setRole('change_planning')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              role === 'change_planning'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Change Planning</span>
            <span className="md:hidden">Changes</span>
          </button>

          <button
            onClick={() => setRole('human_operator')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              role === 'human_operator'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Human Gate (HITL)</span>
            <span className="md:hidden">Approvals</span>
          </button>
        </div>

        {/* Right: Quick Tools, Tenant & Investigation CTA */}
        <div className="flex items-center gap-2">
          {/* Quick Inspector Pills */}
          <div className="hidden xl:flex items-center gap-1 text-[11px]">
            <button
              onClick={onOpenLangGraphModal}
              title="Inspect LangGraph State Machine"
              className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1 transition-all"
            >
              <GitFork className="w-3 h-3 text-indigo-600" />
              LangGraph
            </button>
            <button
              onClick={onOpenVectorSearch}
              title="Search ChromaDB Runbooks"
              className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-semibold flex items-center gap-1 transition-all"
            >
              <Search className="w-3 h-3 text-sky-600" />
              Runbooks
            </button>
            <button
              onClick={onOpenNeo4jModal}
              title="Neo4j Cypher Explorer"
              className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1 transition-all"
            >
              <Terminal className="w-3 h-3 text-amber-600" />
              Neo4j
            </button>
          </div>

          {/* Tenant Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <select
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium outline-none cursor-pointer"
            >
              <option value="customer_a">Customer A</option>
              <option value="customer_b">Customer B</option>
            </select>
          </div>

          {/* Main Action Trigger */}
          <button
            onClick={onRunInvestigation}
            disabled={isInvestigating}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
              isInvestigating
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isInvestigating ? 'animate-spin' : ''}`} />
            <span>{isInvestigating ? 'Analyzing...' : 'Investigate 10:05'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

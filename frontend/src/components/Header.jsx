import React from 'react';
import { Radio, AlertTriangle, ShieldCheck, Zap, UserCheck, Layers } from 'lucide-react';

export default function Header({
  tenant,
  setTenant,
  role,
  setRole,
  isInvestigating,
  onRunInvestigation
}) {
  return (
    <header className="glass-panel p-4 mb-6 flex flex-wrap items-center justify-between gap-4 border border-slate-800">
      {/* Brand & Incident Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Telecom Network Intelligence Platform
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Incident @ 10:05 UTC
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> SLA &lt; 2s (p95)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-Based Autonomous AI Agents with Deterministic Safeguards &amp; Model Context Protocol
          </p>
        </div>
      </div>

      {/* Governance Controls: Tenant & Role Switchers */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Tenant Scope */}
        <div className="flex flex-col text-left">
          <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" /> Tenant Scope
          </label>
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="customer_a">Customer A (Strict Isolation)</option>
            <option value="customer_b">Customer B (Isolated Boundary)</option>
          </select>
        </div>

        {/* Role Selector */}
        <div className="flex flex-col text-left">
          <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-purple-400" /> Active Role (RBAC)
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="alarm_management">Alarm Management Agent</option>
            <option value="performance_analysis">Performance Analysis Agent</option>
            <option value="change_planning">Change Planning Agent</option>
            <option value="human_operator">Human Operator (Approver)</option>
          </select>
        </div>

        {/* Run CTA */}
        <button
          onClick={onRunInvestigation}
          disabled={isInvestigating}
          className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 shadow-lg transition-all duration-200 mt-3.5 ${
            isInvestigating
              ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-95'
          }`}
        >
          <Zap className={`w-4 h-4 ${isInvestigating ? 'animate-spin' : ''}`} />
          {isInvestigating ? 'Investigating...' : 'Investigate 10:05 UTC Incident'}
        </button>
      </div>
    </header>
  );
}

import React from 'react';
import { Activity, ShieldCheck, Zap, UserCheck, Layers } from 'lucide-react';

export default function Header({
  tenant,
  setTenant,
  role,
  setRole,
  isInvestigating,
  onRunInvestigation
}) {
  return (
    <header className="clean-card p-4 md:p-5 mb-5 border border-slate-200 bg-white shadow-sm flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Incident Status */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Telecom Network Intelligence Platform
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              Incident at 10:05 UTC
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              SLA &lt; 2s (p95)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Autonomous AI Agents • Model Context Protocol (MCP) • Bi-Temporal Graph Engine
          </p>
        </div>
      </div>

      {/* Governance Controls: Tenant & Role Switchers */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Tenant Scope */}
        <div className="flex flex-col text-left">
          <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" /> Tenant Scope
          </label>
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer font-medium shadow-sm transition-all"
          >
            <option value="customer_a">Customer A (Strict Isolation)</option>
            <option value="customer_b">Customer B (Airgap Boundary)</option>
          </select>
        </div>

        {/* Role Selector */}
        <div className="flex flex-col text-left">
          <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-slate-400" /> Active Role (RBAC)
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer font-medium shadow-sm transition-all"
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
          className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all duration-200 shadow-sm mt-4 ${
            isInvestigating
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-95'
          }`}
        >
          <Zap className={`w-4 h-4 ${isInvestigating ? 'animate-spin' : ''}`} />
          {isInvestigating ? 'Investigating...' : 'Investigate 10:05 Incident'}
        </button>
      </div>
    </header>
  );
}

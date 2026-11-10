import React from 'react';
import { AlertTriangle, LineChart, Sliders, UserCheck, ShieldCheck, Zap, Lock, Key } from 'lucide-react';

export default function AgentWorkspaceBanner({ role, tenant }) {
  const roleMetadata = {
    alarm_management: {
      title: 'Alarm Management Autonomous Agent',
      subtitle: 'Incident Triage & Root-Cause Diagnosis',
      icon: AlertTriangle,
      iconColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      description: 'Traverses 2-hop network topology, correlates shared upstream bottlenecks, evaluates telemetry completeness, and formulates remediation proposals.',
      permissions: ['TOPOLOGY_READ', 'ALARM_READ', 'PROPOSE_REMEDIATION'],
      sla: '< 30s Target',
      tools: ['get_neighborhood', 'get_shared_dependencies', 'run_langgraph', 'search_runbooks']
    },
    performance_analysis: {
      title: 'Performance Analysis Agent',
      subtitle: 'KPI Telemetry & Data Quality Engine',
      icon: LineChart,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Aggregates 15-minute performance counters, tracks late data up to 2 hours with delta recalculations, and evaluates mathematical evidence integrity.',
      permissions: ['KPI_READ', 'DATA_QUALITY_EVAL'],
      sla: '< 5s Target',
      tools: ['get_kpis', 'assess_data_quality', 'calculate_window_kpi', 'watermark_recalc']
    },
    change_planning: {
      title: 'Change Planning Agent',
      subtitle: 'Pre-Change Simulation & Blast Radius Sandbox',
      icon: Sliders,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      description: 'Executes pre-change impact simulations, calculates downstream subscriber blast radius, and validates standby microwave capacity.',
      permissions: ['SIMULATE_CHANGE', 'TOPOLOGY_READ'],
      sla: '< 10s Target',
      tools: ['simulate_change', 'evaluate_blast_radius', 'verify_redundant_capacity']
    },
    human_operator: {
      title: 'Human Operator (NOC Lead Approver)',
      subtitle: 'Production Governance & HITL Sign-Off Gate',
      icon: UserCheck,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      description: 'Authorized production gatekeeper. Reviews AI-staged remediation proposals, inspects justifications, signs authorization comments, and executes production changes.',
      permissions: ['APPROVE_CHANGE', 'REJECT_CHANGE', 'AUDIT_LOG_READ'],
      sla: 'Human Authority',
      tools: ['approve_action', 'reject_action', 'view_immutable_audit_log']
    }
  };

  const current = roleMetadata[role] || roleMetadata.alarm_management;
  const Icon = current.icon;

  return (
    <div className={`clean-card p-4 mb-5 bg-white border ${current.borderColor} rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
      <div className="flex items-start gap-3.5">
        <div className={`w-10 h-10 rounded-xl ${current.bgColor} border ${current.borderColor} flex items-center justify-center ${current.iconColor} shrink-0 shadow-sm mt-0.5`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {current.title}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {current.subtitle}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              SLA: {current.sla}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            {current.description}
          </p>
        </div>
      </div>

      {/* Permissions and Scope Badges */}
      <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400">RBAC Scope:</span>
          {current.permissions.map((perm) => (
            <span key={perm} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
              {perm}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Key className="w-3 h-3 text-slate-400" />
          <span>Active Tenant: <strong className="text-slate-800 font-semibold">{tenant}</strong> (Strict Isolation)</span>
        </div>
      </div>
    </div>
  );
}


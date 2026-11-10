import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DatabaseStatusRow from './components/DatabaseStatusRow';
import AgentWorkspaceBanner from './components/AgentWorkspaceBanner';
import KpiMetricsRow from './components/KpiMetricsRow';
import TopologyMap from './components/TopologyMap';
import AgentTraceConsole from './components/AgentTraceConsole';
import HitlApprovalCard from './components/HitlApprovalCard';
import PerformanceAnalysisConsole from './components/PerformanceAnalysisConsole';
import ChangePlanningConsole from './components/ChangePlanningConsole';
import ExecutiveStoryView from './components/ExecutiveStoryView';
import VectorSearchModal from './components/VectorSearchModal';
import Neo4jExplorerModal from './components/Neo4jExplorerModal';
import LangGraphModal from './components/LangGraphModal';
import { AlertTriangle, LineChart, Sliders, UserCheck, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [tenant, setTenant] = useState('customer_a');
  const [role, setRole] = useState('alarm_management');
  const [showIncidentPath, setShowIncidentPath] = useState(true);
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [], latency_ms: 0.85 });
  const [kpiRecords, setKpiRecords] = useState([]);
  const [stagedAction, setStagedAction] = useState(null);
  const [investigationReport, setInvestigationReport] = useState(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
  const [isNeo4jModalOpen, setIsNeo4jModalOpen] = useState(false);
  const [isLangGraphModalOpen, setIsLangGraphModalOpen] = useState(false);

  // Load data on mount & tenant switch
  useEffect(() => {
    loadTopology();
    loadKPIs();
    loadStagedActions();
    loadSystemStatus();
  }, [tenant]);

  async function loadSystemStatus() {
    try {
      const res = await fetch('/api/v1/system/status');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (e) {
      console.error('Failed to load system status', e);
    }
  }

  async function loadTopology() {
    try {
      const res = await fetch(
        `/api/v1/topology/neighborhood?entity_id=CELL_001&as_of=2026-11-10T10:05:00Z&max_hops=2&tenant_id=${tenant}`
      );
      if (res.ok) {
        const data = await res.json();
        setTopologyData(data);
      }
    } catch (e) {
      console.error('Failed to load topology', e);
    }
  }

  async function loadKPIs() {
    try {
      const resCell = await fetch(`/api/v1/kpi/entity?entity_id=CELL_001&tenant_id=${tenant}`);
      const dataCell = resCell.ok ? await resCell.json() : { records: [] };

      const resRouter = await fetch(`/api/v1/kpi/entity?entity_id=CSR_ALPHA_01&tenant_id=${tenant}`);
      const dataRouter = resRouter.ok ? await resRouter.json() : { records: [] };

      const resCtrl = await fetch(`/api/v1/kpi/entity?entity_id=CELL_099&tenant_id=${tenant}`);
      const dataCtrl = resCtrl.ok ? await resCtrl.json() : { records: [] };

      const combined = [
        ...(dataCell.records || []),
        ...(dataRouter.records || []),
        ...(dataCtrl.records || [])
      ];
      setKpiRecords(combined.slice(0, 8));
    } catch (e) {
      console.error('Failed to load KPIs', e);
    }
  }

  async function loadStagedActions() {
    try {
      const res = await fetch(`/api/v1/actions?tenant_id=${tenant}`);
      if (res.ok) {
        const actions = await res.json();
        if (actions.length > 0) {
          setStagedAction(actions[actions.length - 1]);
        } else {
          setStagedAction(null);
        }
      }
    } catch (e) {
      console.error('Failed to load actions', e);
    }
  }

  async function handleRunInvestigation() {
    setIsInvestigating(true);
    setInvestigationReport(null);

    try {
      const res = await fetch('/api/v1/investigation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant,
          affected_cells: ['CELL_001', 'CELL_002', 'CELL_003'],
          incident_time: '2026-11-10T10:05:00Z'
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const report = await res.json();
      setInvestigationReport(report);
      await loadStagedActions();
    } catch (e) {
      alert(`Investigation failed: ${e.message}`);
    } finally {
      setIsInvestigating(false);
    }
  }

  async function handleApproveAction() {
    if (!stagedAction) return;
    try {
      const res = await fetch(`/api/v1/actions/${stagedAction.action_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_id: 'lead_operator_sarah',
          tenant_id: tenant,
          comment: 'Verified redundant microwave capacity and alarm correlation. Approved.'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Governance Denied: ${err.detail || 'Insufficient permissions'}`);
        return;
      }

      await loadStagedActions();
      await loadTopology();
      await loadKPIs();
    } catch (e) {
      alert(`Approval error: ${e.message}`);
    }
  }

  async function handleRejectAction() {
    if (!stagedAction) return;
    try {
      const res = await fetch(`/api/v1/actions/${stagedAction.action_id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_id: 'lead_operator_sarah',
          tenant_id: tenant,
          reason: 'Manual field dispatch requested instead.'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Governance Denied: ${err.detail || 'Insufficient permissions'}`);
        return;
      }

      await loadStagedActions();
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6 max-w-[1680px] mx-auto text-slate-800 font-sans">
      {/* Top Application Header */}
      <Header
        tenant={tenant}
        setTenant={setTenant}
        role={role}
        setRole={setRole}
        isInvestigating={isInvestigating}
        onRunInvestigation={handleRunInvestigation}
      />

      {/* Database & AI Engine Status Row */}
      <DatabaseStatusRow
        systemStatus={systemStatus}
        onOpenVectorSearch={() => setIsVectorModalOpen(true)}
        onOpenNeo4jModal={() => setIsNeo4jModalOpen(true)}
        onOpenLangGraphModal={() => setIsLangGraphModalOpen(true)}
      />

      {/* Agent Workspace Navigation Bar */}
      <div className="flex items-center justify-between mb-4 p-1.5 rounded-xl bg-white border border-slate-200 shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
            Agent Role Workspace:
          </span>

          <button
            onClick={() => setRole('alarm_management')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              role === 'alarm_management'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            1. Alarm Management Agent
          </button>

          <button
            onClick={() => setRole('performance_analysis')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              role === 'performance_analysis'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LineChart className="w-4 h-4 text-blue-600" />
            2. Performance Analysis Agent
          </button>

          <button
            onClick={() => setRole('change_planning')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              role === 'change_planning'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            3. Change Planning Agent
          </button>

          <button
            onClick={() => setRole('human_operator')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              role === 'human_operator'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            4. Human Operator (HITL Gate)
          </button>
        </div>

        <button
          onClick={() => setShowIncidentPath(!showIncidentPath)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all"
        >
          {showIncidentPath ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showIncidentPath ? 'Hide Incident Overview' : 'Show Incident Overview'}
        </button>
      </div>

      {/* Active Agent Banner */}
      <AgentWorkspaceBanner role={role} tenant={tenant} />

      {/* Persistent Incident Summary Bar (Toggleable) */}
      {showIncidentPath && (
        <div className="mb-5">
          <ExecutiveStoryView
            tenant={tenant}
            report={investigationReport}
            stagedAction={stagedAction}
            isInvestigating={isInvestigating}
            onRunInvestigation={handleRunInvestigation}
            onApprove={handleApproveAction}
            onReject={handleRejectAction}
            role={role}
          />
        </div>
      )}

      {/* DYNAMIC AGENT WORKSPACES */}

      {/* WORKSPACE 1: ALARM MANAGEMENT AGENT */}
      {role === 'alarm_management' && (
        <div className="space-y-5">
          <KpiMetricsRow
            latencyMs={topologyData.latency_ms}
            report={investigationReport}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TopologyMap
              nodes={topologyData.nodes}
              edges={topologyData.edges}
              latencyMs={topologyData.latency_ms}
              tenant={tenant}
            />
            <AgentTraceConsole
              report={investigationReport}
              isInvestigating={isInvestigating}
              onTrigger={handleRunInvestigation}
            />
          </div>
        </div>
      )}

      {/* WORKSPACE 2: PERFORMANCE ANALYSIS AGENT */}
      {role === 'performance_analysis' && (
        <PerformanceAnalysisConsole
          kpiRecords={kpiRecords}
          tenant={tenant}
        />
      )}

      {/* WORKSPACE 3: CHANGE PLANNING AGENT */}
      {role === 'change_planning' && (
        <ChangePlanningConsole
          tenant={tenant}
        />
      )}

      {/* WORKSPACE 4: HUMAN OPERATOR (HITL APPROVER) */}
      {role === 'human_operator' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <HitlApprovalCard
            action={stagedAction}
            onApprove={handleApproveAction}
            onReject={handleRejectAction}
            role={role}
          />
        </div>
      )}

      {/* ChromaDB Vector Search Modal */}
      <VectorSearchModal
        isOpen={isVectorModalOpen}
        onClose={() => setIsVectorModalOpen(false)}
      />

      {/* Neo4j Cypher Explorer & Bi-Temporal Modal */}
      <Neo4jExplorerModal
        isOpen={isNeo4jModalOpen}
        onClose={() => setIsNeo4jModalOpen(false)}
        systemStatus={systemStatus}
      />

      {/* LangGraph State Machine Visualization Modal */}
      <LangGraphModal
        isOpen={isLangGraphModalOpen}
        onClose={() => setIsLangGraphModalOpen(false)}
      />
    </div>
  );
}

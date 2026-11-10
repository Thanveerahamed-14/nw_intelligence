import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DatabaseStatusRow from './components/DatabaseStatusRow';
import KpiMetricsRow from './components/KpiMetricsRow';
import TopologyMap from './components/TopologyMap';
import AgentTraceConsole from './components/AgentTraceConsole';
import KpiTable from './components/KpiTable';
import HitlApprovalCard from './components/HitlApprovalCard';
import VectorSearchModal from './components/VectorSearchModal';
import Neo4jExplorerModal from './components/Neo4jExplorerModal';
import ExecutiveStoryView from './components/ExecutiveStoryView';
import { Sparkles, Sliders, Eye } from 'lucide-react';

export default function App() {
  const [tenant, setTenant] = useState('customer_a');
  const [role, setRole] = useState('alarm_management');
  const [viewMode, setViewMode] = useState('simple'); // 'simple' | 'technical'
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [], latency_ms: 0.85 });
  const [kpiRecords, setKpiRecords] = useState([]);
  const [stagedAction, setStagedAction] = useState(null);
  const [investigationReport, setInvestigationReport] = useState(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
  const [isNeo4jModalOpen, setIsNeo4jModalOpen] = useState(false);

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
    <div className="min-h-screen p-3 md:p-6 max-w-[1680px] mx-auto text-slate-100">
      {/* Top Header */}
      <Header
        tenant={tenant}
        setTenant={setTenant}
        role={role}
        setRole={setRole}
        isInvestigating={isInvestigating}
        onRunInvestigation={handleRunInvestigation}
      />

      {/* View Switcher: Simple Story vs Technical NOC */}
      <div className="flex items-center justify-between mb-5 px-1 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setViewMode('simple')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'simple'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            Simple Overview (Executive Story)
          </button>
          <button
            onClick={() => setViewMode('technical')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'technical'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Technical NOC View (Engineering Deep Dive)
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Mode:</span>
          <strong className="text-slate-200">
            {viewMode === 'simple' ? 'Simple & Intuitive' : 'Deep Telemetry & Graphs'}
          </strong>
        </div>
      </div>

      {/* Database & AI Engine Status Row */}
      <DatabaseStatusRow
        systemStatus={systemStatus}
        onOpenVectorSearch={() => setIsVectorModalOpen(true)}
        onOpenNeo4jModal={() => setIsNeo4jModalOpen(true)}
      />

      {/* VIEW MODE 1: SIMPLE STORY VIEW */}
      {viewMode === 'simple' ? (
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
      ) : (
        /* VIEW MODE 2: TECHNICAL NOC VIEW */
        <>
          {/* KPI Metric Summary Row */}
          <KpiMetricsRow
            latencyMs={topologyData.latency_ms}
            report={investigationReport}
          />

          {/* Row 1: Topology Map & Agent Investigation Trace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
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

          {/* Row 2: KPI Engine Data Quality Table & HITL Approval Console */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <KpiTable records={kpiRecords} />
            <HitlApprovalCard
              action={stagedAction}
              onApprove={handleApproveAction}
              onReject={handleRejectAction}
              role={role}
            />
          </div>
        </>
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
    </div>
  );
}

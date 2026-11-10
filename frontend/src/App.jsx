import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KpiMetricsRow from './components/KpiMetricsRow';
import TopologyMap from './components/TopologyMap';
import AgentTraceConsole from './components/AgentTraceConsole';
import KpiTable from './components/KpiTable';
import HitlApprovalCard from './components/HitlApprovalCard';

export default function App() {
  const [tenant, setTenant] = useState('customer_a');
  const [role, setRole] = useState('alarm_management');
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [], latency_ms: 0.85 });
  const [kpiRecords, setKpiRecords] = useState([]);
  const [stagedAction, setStagedAction] = useState(null);
  const [investigationReport, setInvestigationReport] = useState(null);
  const [isInvestigating, setIsInvestigating] = useState(false);

  // Load data on mount & tenant switch
  useEffect(() => {
    loadTopology();
    loadKPIs();
    loadStagedActions();
  }, [tenant]);

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
    <div className="min-h-screen p-4 md:p-6 max-w-[1600px] mx-auto text-slate-100">
      {/* Top Header */}
      <Header
        tenant={tenant}
        setTenant={setTenant}
        role={role}
        setRole={setRole}
        isInvestigating={isInvestigating}
        onRunInvestigation={handleRunInvestigation}
      />

      {/* KPI Metric Summary Row */}
      <KpiMetricsRow
        latencyMs={topologyData.latency_ms}
        report={investigationReport}
      />

      {/* Row 1: Topology Map & Agent Investigation Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KpiTable records={kpiRecords} />
        <HitlApprovalCard
          action={stagedAction}
          onApprove={handleApproveAction}
          onReject={handleRejectAction}
          role={role}
        />
      </div>
    </div>
  );
}

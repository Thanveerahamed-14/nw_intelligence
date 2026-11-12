import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import IncidentPathStrip from './components/IncidentPathStrip';
import TopologyMap from './components/TopologyMap';
import AgentTraceConsole from './components/AgentTraceConsole';
import HitlApprovalCard from './components/HitlApprovalCard';
import PerformanceAnalysisConsole from './components/PerformanceAnalysisConsole';
import ChangePlanningConsole from './components/ChangePlanningConsole';
import VectorSearchModal from './components/VectorSearchModal';
import Neo4jExplorerModal from './components/Neo4jExplorerModal';
import LangGraphModal from './components/LangGraphModal';
import KpiMetricsRow from './components/KpiMetricsRow';

export default function App() {
  const [tenant, setTenant] = useState('customer_a');
  const [theme, setTheme] = useState(() => localStorage.getItem('noc-theme') === 'light' ? 'light' : 'dark');
  const [role, setRole] = useState('alarm_management');
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [], latency_ms: 0.85 });
  const [bypassTopology, setBypassTopology] = useState({ nodes: [], edges: [] });
  const [kpiRecords, setKpiRecords] = useState([]);
  const [stagedAction, setStagedAction] = useState(null);
  const [investigationReport, setInvestigationReport] = useState(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
  const [isNeo4jModalOpen, setIsNeo4jModalOpen] = useState(false);
  const [isLangGraphModalOpen, setIsLangGraphModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('noc-theme', theme);
  }, [theme]);

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
    const asOf = '2026-11-10T10:05:00Z';
    try {
      const res = await fetch(
        `/api/v1/topology/neighborhood?entity_id=CELL_001&as_of=${asOf}&max_hops=2&tenant_id=${tenant}`
      );
      if (!res.ok) {
        setTopologyData({ nodes: [], edges: [], latency_ms: null });
        setBypassTopology({ nodes: [], edges: [] });
        return;
      }
      const data = await res.json();
      setTopologyData(data);

      // Expand the access router so the failover schematic includes both
      // transport paths and the aggregation node, not just the cell neighbourhood.
      const seedRouter = (data.nodes || [])
        .filter((node) => node.entity_type === 'router')
        .sort((a, b) => (a.distance_hops ?? 99) - (b.distance_hops ?? 99))[0];

      if (!seedRouter) {
        setBypassTopology(data);
        return;
      }

      const expandedRes = await fetch(
        `/api/v1/topology/neighborhood?entity_id=${encodeURIComponent(seedRouter.id)}&as_of=${asOf}&max_hops=2&tenant_id=${tenant}`
      );
      setBypassTopology(expandedRes.ok ? await expandedRes.json() : data);
    } catch (e) {
      console.error('Failed to load topology', e);
      setBypassTopology({ nodes: [], edges: [] });
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
      setKpiRecords(combined);
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
    if (tenant !== 'customer_a') {
      alert('No incident is active for this tenant. Tenant isolation prevents reading Customer A data.');
      return;
    }
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
      await loadSystemStatus();
      await loadKPIs();
    } catch (e) {
      alert(`Investigation failed: ${e.message}`);
    } finally {
      setIsInvestigating(false);
    }
  }

  async function handleApproveAction(comment) {
    if (!stagedAction) return;
    const auditComment = typeof comment === 'string' && comment.trim()
      ? comment.trim()
      : 'Approved by human operator via HITL gate.';
    try {
      const res = await fetch(`/api/v1/actions/${stagedAction.action_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant,
          comment: auditComment
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

  const derivedMetrics = useMemo(() => {
    const records = kpiRecords || [];
    const numeric = (name) => records
      .filter((r) => r.kpi_name === name)
      .map((r) => Number(r.value))
      .filter(Number.isFinite);
    const availabilities = numeric('CELL_AVAILABILITY');
    const losses = numeric('TRANSPORT_PACKET_LOSS');

    const parsePct = (value) => {
      const parsed = parseFloat(String(value ?? ''));
      return Number.isFinite(parsed) ? parsed : null;
    };
    const summary = investigationReport?.kpi_summary || {};
    const availability = parsePct(summary.cell_availability)
      ?? (availabilities.length ? Math.min(...availabilities) : null);
    const packetLoss = parsePct(summary.csr_packet_loss)
      ?? (losses.length ? Math.max(...losses) : null);

    const quality = investigationReport?.data_quality_assessment || {};
    const entries = Object.values(quality).filter((e) => e && typeof e === 'object');
    const genuine = entries.filter((e) => e.verdict === 'GENUINE_NETWORK_PROBLEM').length;
    const telemetry = entries.length
      ? {
          value: `${genuine}/${entries.length}`,
          note: 'entities verified genuine',
          state: genuine > 0 ? 'healthy' : 'warning',
          detail: genuine > 0 ? 'Physical fault confirmed' : 'Telemetry gap or no data'
        }
      : null;

    const topologyCellCount = (topologyData.nodes || []).filter(
      (n) => (n.type || n.entity_type) === 'cell'
    ).length;

    return {
      availability,
      packetLoss,
      telemetry,
      affectedCells: investigationReport?.affected_entities?.length || topologyCellCount || 0
    };
  }, [kpiRecords, investigationReport, topologyData]);

  return (
    <div className={`app-shell min-h-screen bg-[#070b13] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white theme-${theme}`}>
      {/* 1. Slim, Modern Sticky Navbar */}
      <Navbar
        tenant={tenant}
        setTenant={setTenant}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        role={role}
        setRole={setRole}
        isInvestigating={isInvestigating}
        onRunInvestigation={handleRunInvestigation}
        systemStatus={systemStatus}
        onOpenVectorSearch={() => setIsVectorModalOpen(true)}
        onOpenNeo4jModal={() => setIsNeo4jModalOpen(true)}
        onOpenLangGraphModal={() => setIsLangGraphModalOpen(true)}
      />

      {/* 2. Main High-Density Workspace Container */}
      <main className="max-w-[1680px] mx-auto px-4 pb-6">
        {/* WORKSPACE 1: ALARM MANAGEMENT AGENT */}
        {role === 'alarm_management' && (
          <div className="space-y-4">
            <section className="workspace-intro" aria-labelledby="workspace-title">
              <div>
                <div className="workspace-eyebrow"><span className={tenant === 'customer_a' ? 'status-pulse' : 'status-pulse status-neutral'} /> {tenant === 'customer_a' ? 'LIVE INCIDENT · CUSTOMER A' : 'CUSTOMER B · ISOLATED TENANT'}</div>
                <h1 id="workspace-title">Alarm triage <span>workspace</span></h1>
                <p>Correlate network health, trace the fault, and review a safe recovery path.</p>
              </div>
              {tenant === 'customer_a' ? <div className="incident-summary">
                <span className="incident-summary-label">Active incident</span>
                <strong><span className="incident-dot" /> Multi-cell service outage</strong>
                <span className="incident-summary-meta">10:05 UTC <i /> {derivedMetrics.affectedCells || '—'} affected cells</span>
              </div> : <div className="incident-summary tenant-summary">
                <span className="incident-summary-label">Tenant boundary</span>
                <strong>Topology access isolated</strong>
                <span className="incident-summary-meta">No Customer A data is shown</span>
              </div>}
            </section>
            {tenant === 'customer_a' && (
              <KpiMetricsRow
                availability={derivedMetrics.availability}
                packetLoss={derivedMetrics.packetLoss}
                affectedCells={derivedMetrics.affectedCells}
                telemetry={derivedMetrics.telemetry}
                latencyMs={topologyData.latency_ms}
              />
            )}
            {tenant === 'customer_a' && (stagedAction?.status === 'APPROVED' || stagedAction?.status === 'EXECUTED') && (
              <p className="metric-snapshot-note text-[11px] text-slate-400 font-mono px-1">
                Post-change telemetry is pending the next 15-minute KPI aggregation &mdash; the metrics above are the
                10:05 UTC pre-remediation snapshot.
              </p>
            )}
            {/* Sleek Incident Path Bypass Strip */}
            {tenant === 'customer_a' ? (
              <>
                <IncidentPathStrip
                  theme={theme}
                  stagedAction={stagedAction}
                  report={investigationReport}
                  topology={bypassTopology}
                  availability={derivedMetrics.availability}
                  packetLoss={derivedMetrics.packetLoss}
                  onApprove={handleApproveAction}
                  onReject={handleRejectAction}
                  role={role}
                  onRequestApproval={() => setRole('human_operator')}
                />

                {/* Side-by-Side Dual Console */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TopologyMap
                    nodes={topologyData.nodes}
                    edges={topologyData.edges}
                    latencyMs={topologyData.latency_ms}
                    packetLoss={derivedMetrics.packetLoss}
                    tenant={tenant}
                  />
                  <AgentTraceConsole
                    report={investigationReport}
                    isInvestigating={isInvestigating}
                    onTrigger={handleRunInvestigation}
                  />
                </div>
              </>
            ) : (
              <section className="clean-card rounded-2xl border border-slate-800/90 bg-slate-900/80 px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="10" width="16" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white">Tenant isolation enforced</h2>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                  This principal has no Customer A topology, KPI, alarm, or action data for this tenant.
                  Incident paths and agent traces remain scoped to Customer A and are withheld here.
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  tenant: {tenant} &bull; 0 nodes &bull; 0 KPI records &bull; 0 staged actions
                </p>
              </section>
            )}
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
          <div className="max-w-3xl mx-auto pt-2">
            <HitlApprovalCard
              action={stagedAction}
              onApprove={handleApproveAction}
              onReject={handleRejectAction}
              role={role}
            />
          </div>
        )}
      </main>

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

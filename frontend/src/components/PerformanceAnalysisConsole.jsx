import React, { useState } from 'react';
import { LineChart, Activity, Clock, AlertTriangle, CheckCircle2, RefreshCw, BarChart2, ShieldCheck, Database } from 'lucide-react';
import KpiTable from './KpiTable';

// CELL_099 is a deliberate control fixture (telemetry-gap branch on SITE_BETA).
// It is shown in the raw KPI table, but must never be averaged into the
// incident's aggregate health, otherwise it drags the headline completeness
// down and falsely implies the incident investigation should be declined.
const CONTROL_ENTITY_IDS = new Set(['CELL_099']);

export default function PerformanceAnalysisConsole({ kpiRecords, tenant }) {
  const [selectedWindow, setSelectedWindow] = useState('incident'); // 'nominal' | 'incident'
  const [isSimulatingLateData, setIsSimulatingLateData] = useState(false);
  const [lateDataStatus, setLateDataStatus] = useState(null);

  const INCIDENT_START = Date.parse('2026-11-10T10:00:00Z');
  const records = kpiRecords || [];
  const isControl = (record) => CONTROL_ENTITY_IDS.has(record?.entity_id);
  const inWindow = (record) => {
    const ts = Date.parse(record?.timestamp || '');
    if (!Number.isFinite(ts)) return false;
    const isIncident = ts >= INCIDENT_START;
    return selectedWindow === 'incident' ? isIncident : !isIncident;
  };
  // Headline tiles describe the incident scope only; the control cell is
  // reported separately in the table.
  const inIncidentScope = (record) => inWindow(record) && !isControl(record);
  const values = (predicate) => records
    .filter((r) => inIncidentScope(r) && predicate(r))
    .map((r) => Number(r.value))
    .filter(Number.isFinite);
  const pct = (value) => (value == null ? 'n/a' : `${value.toFixed(2)}%`);

  const cellAvailability = values((r) => r.kpi_name === 'CELL_AVAILABILITY');
  const primaryLoss = values((r) => r.kpi_name === 'TRANSPORT_PACKET_LOSS' && !/STANDBY/i.test(r.entity_id || ''));
  const standbyLoss = values((r) => r.kpi_name === 'TRANSPORT_PACKET_LOSS' && /STANDBY/i.test(r.entity_id || ''));
  const windowRecords = records.filter(inWindow);
  const incidentWindowRecords = windowRecords.filter((r) => !isControl(r));
  const controlWindowRecords = windowRecords.filter(isControl);
  const completeness = incidentWindowRecords.length
    ? incidentWindowRecords.reduce((sum, r) => sum + (Number(r.completeness_score) || 0), 0) / incidentWindowRecords.length
    : null;

  const minAvailability = cellAvailability.length ? Math.min(...cellAvailability) : null;
  const maxPrimaryLoss = primaryLoss.length ? Math.max(...primaryLoss) : null;
  const maxStandbyLoss = standbyLoss.length ? Math.max(...standbyLoss) : null;

  function handleSimulateLateData() {
    setIsSimulatingLateData(true);
    setTimeout(() => {
      setIsSimulatingLateData(false);
      setLateDataStatus({
        recalculated: true,
        revision: 2,
        delta_records_updated: 3,
        watermark: '2026-11-10T11:50:00Z',
        message: 'Late-arriving counters from Cisco EPN-M processed. Sliding watermark accepted delta; revision incremented from 1 -> 2 without full table re-scan.'
      });
    }, 600);
  }

  return (
    <div className="space-y-5">
      {/* Telemetry Overview & Window Selector */}
      <div className="clean-card p-5 bg-slate-900/80 border border-slate-800/80 rounded-xl shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-950">
              <LineChart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">15-Minute Sliding Window Telemetry Analyzer</h2>
              <p className="text-xs text-slate-400">
                Performance Analysis Agent validates counter completeness and detects degradation patterns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Telemetry Window:</span>
            <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-slate-950">
              <button
                onClick={() => setSelectedWindow('incident')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedWindow === 'incident'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                10:00 - 10:15 UTC (Incident)
              </button>
              <button
                onClick={() => setSelectedWindow('nominal')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedWindow === 'nominal'
                    ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                09:45 - 10:00 UTC (Nominal)
              </button>
            </div>
          </div>
        </div>

        {/* Live Metric Comparison Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {/* Tile 1: Primary Fiber */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Primary Fiber (10G)</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                (maxPrimaryLoss ?? 0) > 5 ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}>
                {(maxPrimaryLoss ?? 0) > 5 ? 'CRITICAL' : 'NOMINAL'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-white">
                {pct(maxPrimaryLoss)}
              </span>
              <span className="text-xs text-slate-400 font-medium">Packet Loss</span>
            </div>
            <p className="text-[11px] text-cyan-400 font-mono">LINK_BACKHAUL_09</p>
          </div>

          {/* Tile 2: Standby Microwave */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Backup Microwave</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                READY
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`font-mono text-emerald-400 ${maxStandbyLoss == null ? 'text-sm font-semibold' : 'text-2xl font-bold'}`}>
                {maxStandbyLoss == null ? 'No incident telemetry' : pct(maxStandbyLoss)}
              </span>
              <span className="text-xs text-slate-400 font-medium shrink-0">
                {maxStandbyLoss == null ? 'Idle / protection' : 'Packet Loss'}
              </span>
            </div>
            <p className="text-[11px] text-amber-400 font-mono">LINK_BACKHAUL_STANDBY_09</p>
            <p className="text-[10px] text-slate-500 leading-snug">
              {maxStandbyLoss == null
                ? 'Protection path is not carrying traffic before cutover, so no loss counters are expected.'
                : 'Standby path is armed and ready for cutover.'}
            </p>
          </div>

          {/* Tile 3: 5G & 4G Cell Towers */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cell Availability</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                (minAvailability ?? 100) < 90 ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}>
                {(minAvailability ?? 100) < 90 ? 'DEGRADED' : 'HEALTHY'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-white">
                {pct(minAvailability)}
              </span>
              <span className="text-xs text-slate-400 font-medium">Availability</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">CELL_001, CELL_002, CELL_003</p>
          </div>

          {/* Tile 4: Evidence Integrity Quality */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evidence Integrity</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                {completeness == null ? 'NO DATA' : `${Math.round(completeness * 100)}% COMPLETE`}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {completeness == null ? 'n/a' : completeness.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-medium">Completeness ({incidentWindowRecords.length} records)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {completeness == null
                ? 'No telemetry in selected window'
                : completeness >= 0.8 ? 'Sufficient evidence for automated action' : 'Insufficient evidence — agent will decline remediation'}
            </p>
            {controlWindowRecords.length > 0 && (
              <p className="text-[10px] text-amber-400 font-mono leading-snug">
                Control cell CELL_099 excluded from aggregate (deliberate telemetry-gap fixture on SITE_BETA).
              </p>
            )}
          </div>
        </div>

        {/* Late Data Simulation Toolbar */}
        <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Late-data sliding watermark supports delayed counters arriving up to <strong className="text-slate-200">2 hours late</strong>.</span>
          </div>

          <button
            onClick={handleSimulateLateData}
            disabled={isSimulatingLateData}
            className="px-3.5 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-500/10 active:scale-95 disabled:bg-slate-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingLateData ? 'animate-spin' : ''}`} />
            {isSimulatingLateData ? 'Processing Late Stream...' : 'Simulate Late-Arriving Data Ingestion'}
          </button>
        </div>

        {/* Late Data Notification Box */}
        {lateDataStatus && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5 shadow-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block font-semibold text-emerald-300">Late-Data Watermark Triggered:</strong>
              <p className="mt-0.5 leading-relaxed text-slate-300">{lateDataStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Normalized KPI & Counter Data Quality Table */}
      <KpiTable records={kpiRecords} />
    </div>
  );
}


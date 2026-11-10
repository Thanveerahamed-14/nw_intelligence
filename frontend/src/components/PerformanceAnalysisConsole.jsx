import React, { useState } from 'react';
import { LineChart, Activity, Clock, AlertTriangle, CheckCircle2, RefreshCw, BarChart2, ShieldCheck, Database } from 'lucide-react';
import KpiTable from './KpiTable';

export default function PerformanceAnalysisConsole({ kpiRecords, tenant }) {
  const [selectedWindow, setSelectedWindow] = useState('incident'); // 'nominal' | 'incident'
  const [isSimulatingLateData, setIsSimulatingLateData] = useState(false);
  const [lateDataStatus, setLateDataStatus] = useState(null);

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
      <div className="clean-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <LineChart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">15-Minute Sliding Window Telemetry Analyzer</h2>
              <p className="text-xs text-slate-500">
                Performance Analysis Agent validates counter completeness and detects degradation patterns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Telemetry Window:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setSelectedWindow('incident')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedWindow === 'incident'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                10:00 - 10:15 UTC (Incident)
              </button>
              <button
                onClick={() => setSelectedWindow('nominal')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedWindow === 'nominal'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Primary Fiber (10G)</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedWindow === 'incident' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {selectedWindow === 'incident' ? 'CRITICAL' : 'NOMINAL'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {selectedWindow === 'incident' ? '94.20%' : '0.04%'}
              </span>
              <span className="text-xs text-slate-500 font-medium">Packet Loss</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">LINK_BACKHAUL_09</p>
          </div>

          {/* Tile 2: Standby Microwave */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Backup Microwave</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                READY
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-700">0.02%</span>
              <span className="text-xs text-slate-500 font-medium">Packet Loss</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">LINK_BACKHAUL_STANDBY_09</p>
          </div>

          {/* Tile 3: 5G & 4G Cell Towers */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cell Availability</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedWindow === 'incident' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {selectedWindow === 'incident' ? 'OFFLINE' : '100% UP'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {selectedWindow === 'incident' ? '0.00%' : '100.00%'}
              </span>
              <span className="text-xs text-slate-500 font-medium">Availability</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">CELL_001, CELL_002, CELL_003</p>
          </div>

          {/* Tile 4: Evidence Integrity Quality */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Evidence Integrity</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                100% GENUINE
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-700">1.00</span>
              <span className="text-xs text-slate-500 font-medium">Completeness (3/3)</span>
            </div>
            <p className="text-[11px] text-slate-500">Zero data gaps detected</p>
          </div>
        </div>

        {/* Late Data Simulation Toolbar */}
        <div className="mt-4 pt-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Late-data sliding watermark supports delayed counters arriving up to <strong>2 hours late</strong>.</span>
          </div>

          <button
            onClick={handleSimulateLateData}
            disabled={isSimulatingLateData}
            className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingLateData ? 'animate-spin' : ''}`} />
            {isSimulatingLateData ? 'Processing Late Stream...' : 'Simulate Late-Arriving Data Ingestion'}
          </button>
        </div>

        {/* Late Data Notification Box */}
        {lateDataStatus && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <strong className="block font-semibold">Late-Data Watermark Triggered:</strong>
              <p className="mt-0.5 leading-relaxed">{lateDataStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Normalized KPI & Counter Data Quality Table */}
      <KpiTable records={kpiRecords} />
    </div>
  );
}


import React, { useState } from 'react';
import { Sliders, ShieldAlert, CheckCircle2, AlertTriangle, Play, RefreshCw, Cpu, Layers } from 'lucide-react';

export default function ChangePlanningConsole({ tenant }) {
  const [targetEntity, setTargetEntity] = useState('CSR_ALPHA_01');
  const [changeType, setChangeType] = useState('REROUTE_STANDBY_MICROWAVE_BACKHAUL');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  async function handleSimulate() {
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch('/api/v1/change/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant,
          target_entity_id: targetEntity,
          change_type: changeType
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data);
      } else {
        const err = await res.json();
        alert(`Simulation failed: ${err.detail || 'Error'}`);
      }
    } catch (e) {
      alert(`Simulation error: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Simulation Setup Card */}
      <div className="clean-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pre-Change Impact Simulation Sandbox</h2>
              <p className="text-xs text-slate-500">
                Change Planning Agent calculates blast radius and verifies redundant capacity before proposing changes.
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
            SIMULATE_CHANGE Permission
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Target Network Entity
            </label>
            <select
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
            >
              <option value="CSR_ALPHA_01">CSR_ALPHA_01 (Cell Site Router - Cisco ASR-903)</option>
              <option value="LINK_BACKHAUL_09">LINK_BACKHAUL_09 (Primary 10G Fiber Link)</option>
              <option value="NODE_42">NODE_42 (Ericsson 5G Baseband)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Proposed Operation
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
            >
              <option value="REROUTE_STANDBY_MICROWAVE_BACKHAUL">
                REROUTE_STANDBY_MICROWAVE_BACKHAUL (Divert to Microwave)
              </option>
              <option value="REBOOT_BASEBAND_UNIT">
                REBOOT_BASEBAND_UNIT (Cold Restart)
              </option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:bg-indigo-400"
            >
              <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Simulating...' : 'Run Impact Simulation'}
            </button>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            Simulation executes in a zero-impact digital twin environment. Real network routing remains unchanged until authorized in the Human-in-the-Loop gate.
          </span>
        </div>
      </div>

      {/* Simulation Results */}
      {simulationResult && (
        <div className="clean-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Simulation Assessment Report</h3>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                simulationResult.risk_level === 'LOW'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              Risk Level: {simulationResult.risk_level}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Target Entity</span>
              <strong className="text-slate-900 font-mono text-sm">{simulationResult.target_entity_id}</strong>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Affected Downstream Cells</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {simulationResult.affected_cells?.map(cell => (
                  <span key={cell} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[11px] font-semibold">
                    {cell}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Subscribers Restored</span>
              <strong className="text-emerald-700 text-sm font-bold">
                ~{simulationResult.estimated_impacted_subscribers} Subscribers
              </strong>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Standby Redundancy Path</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Available (10G Microwave)</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-900 space-y-1">
            <strong className="font-bold block">Agent Assessment &amp; Justification:</strong>
            <p className="leading-relaxed">{simulationResult.recommendation}</p>
          </div>

          {simulationResult.requires_human_approval && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Safety Boundary Enforced: This operation requires Tier-2 NOC Human Lead sign-off before entering production execution.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


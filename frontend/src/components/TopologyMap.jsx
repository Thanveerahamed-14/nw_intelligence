import React, { useState } from 'react';
import { Network, Info, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export default function TopologyMap({ nodes, edges, latencyMs, tenant }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Layout node definitions for clean telecommunication topology visualization
  const layout = {
    CELL_001: { x: 60, y: 70, color: '#ef4444', type: 'Cell (5G NR)', vendor: 'Ericsson', label: 'CELL_001', sub: 'Sector 1 (n78)' },
    CELL_002: { x: 60, y: 160, color: '#ef4444', type: 'Cell (5G NR)', vendor: 'Ericsson', label: 'CELL_002', sub: 'Sector 2 (n78)' },
    CELL_003: { x: 60, y: 250, color: '#ef4444', type: 'Cell (4G LTE)', vendor: 'Nokia', label: 'CELL_003', sub: 'Sector 1 (B3)' },
    NODE_42: { x: 200, y: 110, color: '#3b82f6', type: 'gNodeB Baseband', vendor: 'Ericsson', label: 'NODE_42', sub: 'BB 6630' },
    NODE_43: { x: 200, y: 250, color: '#3b82f6', type: 'gNodeB Baseband', vendor: 'Nokia', label: 'NODE_43', sub: 'AirScale SM' },
    SITE_ALPHA: { x: 340, y: 65, color: '#8b5cf6', type: 'Tower Site', vendor: 'CrownCastle', label: 'SITE_ALPHA', sub: 'Downtown Tower' },
    CSR_ALPHA_01: { x: 340, y: 180, color: '#f59e0b', type: 'Cell Site Router', vendor: 'Cisco', label: 'CSR_ALPHA_01', sub: 'ASR-903 (Shared)' },
    LINK_BACKHAUL_09: { x: 475, y: 120, color: '#ef4444', type: 'Fiber Backhaul', vendor: 'Cisco', label: 'FIBER_10G', sub: '94.2% Packet Loss' },
    LINK_BACKHAUL_STANDBY_09: { x: 475, y: 240, color: '#eab308', type: 'Standby Microwave', vendor: 'SIAE', label: 'MW_STANDBY', sub: 'Protection Link' },
    AGG_ROUTER_01: { x: 595, y: 180, color: '#10b981', type: 'Agg Router', vendor: 'Juniper', label: 'AGG_01', sub: 'MX960 Core' }
  };

  const links = [
    { u: 'CELL_001', v: 'NODE_42' },
    { u: 'CELL_002', v: 'NODE_42' },
    { u: 'CELL_003', v: 'NODE_43' },
    { u: 'NODE_42', v: 'SITE_ALPHA' },
    { u: 'NODE_43', v: 'SITE_ALPHA' },
    { u: 'NODE_42', v: 'CSR_ALPHA_01' },
    { u: 'NODE_43', v: 'CSR_ALPHA_01' },
    { u: 'CSR_ALPHA_01', v: 'LINK_BACKHAUL_09', failing: true },
    { u: 'CSR_ALPHA_01', v: 'LINK_BACKHAUL_STANDBY_09', standby: true },
    { u: 'LINK_BACKHAUL_09', v: 'AGG_ROUTER_01', failing: true },
    { u: 'LINK_BACKHAUL_STANDBY_09', v: 'AGG_ROUTER_01', standby: true }
  ];

  if (tenant === 'customer_b') {
    return (
      <div className="clean-card p-5 border border-slate-800 bg-slate-900/80 flex flex-col items-center justify-center h-[450px] text-center">
        <Layers className="w-12 h-12 text-slate-500 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">Customer B Isolated Boundary</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Zero cross-tenant topology entities accessible. Customer A's 10:05 UTC incident data is strictly segregated.
        </p>
      </div>
    );
  }

  return (
    <div className="clean-card p-5 border border-slate-800 bg-slate-900/80 flex flex-col h-[450px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Network Topology Graph (as of 10:05 UTC)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Latency: {latencyMs || 0.77} ms
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SLA Met
          </span>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative flex-1 bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
        <svg viewBox="0 0 650 320" className="w-full h-full">
          {/* Links */}
          {links.map((link, idx) => {
            const p1 = layout[link.u];
            const p2 = layout[link.v];
            if (!p1 || !p2) return null;
            return (
              <line
                key={idx}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                strokeWidth={link.failing ? 3 : 2}
                stroke={link.failing ? '#ef4444' : link.standby ? '#f59e0b' : '#334155'}
                className={link.failing ? 'failing-link' : link.standby ? 'standby-link' : ''}
              />
            );
          })}

          {/* Nodes */}
          {Object.entries(layout).map(([id, node]) => {
            const isSelected = selectedNode?.id === id;
            return (
              <g
                key={id}
                onClick={() => setSelectedNode({ id, ...node })}
                className="cursor-pointer group"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 16 : 13}
                  fill={node.color}
                  stroke="#1e293b"
                  strokeWidth={2.5}
                  className="transition-all duration-150 group-hover:scale-110"
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={3.5}
                  fill="#ffffff"
                  className="pointer-events-none"
                />
                <text
                  x={node.x}
                  y={node.y + 24}
                  textAnchor="middle"
                  className="text-[10px] font-medium fill-slate-200 pointer-events-none"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 36}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 pointer-events-none"
                >
                  {node.sub}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Inspector Overlay */}
        {selectedNode && (
          <div className="absolute top-3 right-3 clean-card p-3.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs max-w-xs shadow-xl animate-fade-in z-20">
            <div className="flex items-center justify-between font-bold text-white mb-1.5 border-b border-slate-800 pb-1">
              <span>{selectedNode.id}</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div><strong className="text-slate-400">Type:</strong> {selectedNode.type}</div>
              <div><strong className="text-slate-400">Vendor:</strong> {selectedNode.vendor}</div>
              <div><strong className="text-slate-400">Status:</strong> {selectedNode.sub}</div>
              <div><strong className="text-slate-400">Valid Time:</strong> 2026-11-10 10:05:00 UTC</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Affected Cells (001-003)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Shared Router (CSR_ALPHA)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-1 bg-rose-500"></span> Failing Fiber Link (94.2% Drop)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-1 border-t border-dashed border-amber-400"></span> Standby Microwave</span>
        </div>
        <span className="text-[11px] text-slate-400">Click node to inspect</span>
      </div>
    </div>
  );
}

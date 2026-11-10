import React, { useState } from 'react';
import { Network, Crosshair, AlertTriangle, Radio, Shield, Zap, Layers } from 'lucide-react';

export default function TopologyMap({ nodes, edges, latencyMs, tenant }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Layout node definitions for clean cyber telecommunication topology visualization
  const layout = {
    CELL_001: { x: 55, y: 70, color: '#ff0055', glow: '#ff0055', type: '5G NR Cell (Sector 1)', vendor: 'Ericsson', label: 'CELL_001', sub: 'Band n78 • DOWN' },
    CELL_002: { x: 55, y: 160, color: '#ff0055', glow: '#ff0055', type: '5G NR Cell (Sector 2)', vendor: 'Ericsson', label: 'CELL_002', sub: 'Band n78 • DOWN' },
    CELL_003: { x: 55, y: 250, color: '#ff0055', glow: '#ff0055', type: '4G LTE Cell (Sector 1)', vendor: 'Nokia', label: 'CELL_003', sub: 'Band B3 • DOWN' },
    NODE_42: { x: 195, y: 110, color: '#00f0ff', glow: '#00f0ff', type: 'Baseband DU (BB 6630)', vendor: 'Ericsson', label: 'NODE_42', sub: 'gNodeB Alpha' },
    NODE_43: { x: 195, y: 250, color: '#00f0ff', glow: '#00f0ff', type: 'Baseband DU (AirScale)', vendor: 'Nokia', label: 'NODE_43', sub: 'eNodeB Beta' },
    SITE_ALPHA: { x: 335, y: 65, color: '#b026ff', glow: '#b026ff', type: 'Macro Tower Physical', vendor: 'CrownCastle', label: 'SITE_ALPHA', sub: 'Downtown Tower' },
    CSR_ALPHA_01: { x: 335, y: 180, color: '#ffaa00', glow: '#ffaa00', type: 'Cell Site Router (ASR-903)', vendor: 'Cisco', label: 'CSR_ALPHA_01', sub: 'SHARED BOTTLENECK' },
    LINK_BACKHAUL_09: { x: 475, y: 115, color: '#ff0055', glow: '#ff0055', type: '10GE Optical Fiber', vendor: 'Cisco', label: 'FIBER_10G', sub: '94.2% PKT LOSS' },
    LINK_BACKHAUL_STANDBY_09: { x: 475, y: 245, color: '#ffaa00', glow: '#ffaa00', type: 'Microwave Protection', vendor: 'SIAE', label: 'MW_STANDBY', sub: 'STANDBY READY' },
    AGG_ROUTER_01: { x: 600, y: 180, color: '#00ff9d', glow: '#00ff9d', type: 'Aggregation Core (MX960)', vendor: 'Juniper', label: 'AGG_CORE', sub: 'IP-RAN CORE' }
  };

  const links = [
    { u: 'CELL_001', v: 'NODE_42', type: 'CPRI_FRONTHAUL' },
    { u: 'CELL_002', v: 'NODE_42', type: 'CPRI_FRONTHAUL' },
    { u: 'CELL_003', v: 'NODE_43', type: 'CPRI_FRONTHAUL' },
    { u: 'NODE_42', v: 'SITE_ALPHA', type: 'PHYSICAL_COLOCATION' },
    { u: 'NODE_43', v: 'SITE_ALPHA', type: 'PHYSICAL_COLOCATION' },
    { u: 'NODE_42', v: 'CSR_ALPHA_01', type: 'ETHERNET_UPLINK' },
    { u: 'NODE_43', v: 'CSR_ALPHA_01', type: 'ETHERNET_UPLINK' },
    { u: 'CSR_ALPHA_01', v: 'LINK_BACKHAUL_09', failing: true, type: 'PRIMARY_FIBER' },
    { u: 'CSR_ALPHA_01', v: 'LINK_BACKHAUL_STANDBY_09', standby: true, type: 'STANDBY_MICROWAVE' },
    { u: 'LINK_BACKHAUL_09', v: 'AGG_ROUTER_01', failing: true, type: 'PRIMARY_FIBER' },
    { u: 'LINK_BACKHAUL_STANDBY_09', v: 'AGG_ROUTER_01', standby: true, type: 'STANDBY_MICROWAVE' }
  ];

  if (tenant === 'customer_b') {
    return (
      <div className="cyber-panel hud-corner p-5 border border-cyan-500/20 bg-cyber-card/90 flex flex-col items-center justify-center h-[460px] text-center">
        <Layers className="w-12 h-12 text-cyan-500/40 mb-3 animate-pulse" />
        <h3 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-widest">
          Tenant Isolation Boundary: CUSTOMER_B
        </h3>
        <p className="text-xs font-mono text-slate-400 max-w-sm mt-2 leading-relaxed">
          Zero cross-tenant topology entities accessible. Customer A's 10:05 UTC incident graph is airgapped and strictly protected by tenant-scoping filters.
        </p>
      </div>
    );
  }

  return (
    <div className="cyber-panel hud-corner p-5 border border-cyan-500/30 bg-cyber-card/90 flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
            Bi-Temporal Topology Radar // 10:05:00 UTC
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
            2-HOP BFS: {latencyMs || 0.77} ms
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
            p95 COMPLIANT
          </span>
        </div>
      </div>

      {/* SVG Radar Map Canvas */}
      <div className="relative flex-1 bg-black/90 rounded border border-cyan-500/20 overflow-hidden shadow-inner">
        {/* Radar Circles Background Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(0,240,255,0.15)_0,rgba(0,240,255,0.05)_40%,transparent_70%)]"></div>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(0,240,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.04)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

        <svg viewBox="0 0 660 320" className="w-full h-full relative z-10">
          <defs>
            {/* Pulsing Red Laser Filter for Failing Backhaul */}
            <filter id="failingGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Cyan Node Glow */}
            <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

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
                strokeWidth={link.failing ? 3.5 : link.standby ? 2.5 : 1.8}
                stroke={link.failing ? '#ff0055' : link.standby ? '#ffaa00' : '#14365d'}
                className={link.failing ? 'failing-link' : link.standby ? 'standby-link' : ''}
              />
            );
          })}

          {/* Nodes */}
          {Object.entries(layout).map(([id, node]) => {
            const isSelected = selectedNode?.id === id;
            const isFailing = node.color === '#ff0055';
            const isBottleneck = id === 'CSR_ALPHA_01';

            return (
              <g
                key={id}
                onClick={() => setSelectedNode({ id, ...node })}
                className="cursor-pointer group"
              >
                {/* Node Outer Pulsing Halo if Failing or Bottleneck */}
                {isFailing && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="20"
                    fill="none"
                    stroke="#ff0055"
                    strokeWidth="1.5"
                    className="animate-ping"
                    style={{ animationDuration: '2s' }}
                    opacity="0.4"
                  />
                )}

                {isBottleneck && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="22"
                    fill="none"
                    stroke="#ffaa00"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    className="animate-spin"
                    style={{ animationDuration: '6s', transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 16 : 12}
                  fill={node.color}
                  stroke="#02040a"
                  strokeWidth="2.5"
                  className="transition-all duration-200 group-hover:scale-125"
                  style={{
                    filter: `drop-shadow(0 0 6px ${node.glow})`
                  }}
                />

                {/* Inner Core Dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="3.5"
                  fill="#ffffff"
                  className="pointer-events-none"
                />

                {/* Primary Label */}
                <text
                  x={node.x}
                  y={node.y + 24}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-white pointer-events-none"
                  style={{ textShadow: '0 0 4px #000' }}
                >
                  {node.label}
                </text>

                {/* Subtitle / Telemetry note */}
                <text
                  x={node.x}
                  y={node.y + 35}
                  textAnchor="middle"
                  className="text-[8.5px] font-mono fill-cyan-400/80 pointer-events-none"
                  style={{ textShadow: '0 0 3px #000' }}
                >
                  {node.sub}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Cyber Inspector Overlay */}
        {selectedNode && (
          <div className="absolute top-3 right-3 cyber-panel hud-corner p-3.5 bg-black/95 border border-cyan-400 text-xs max-w-xs shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-fade-in z-20">
            <div className="flex items-center justify-between font-mono font-bold text-cyan-300 mb-2 border-b border-cyan-500/30 pb-1">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                {selectedNode.id}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white px-1 font-mono"
              >
                [X]
              </button>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div><span className="text-slate-400">CLASS:</span> <span className="text-slate-200 font-bold">{selectedNode.type}</span></div>
              <div><span className="text-slate-400">VENDOR:</span> <span className="text-cyan-400">{selectedNode.vendor}</span></div>
              <div><span className="text-slate-400">TELEMETRY:</span> <span className="text-rose-400 font-bold">{selectedNode.sub}</span></div>
              <div><span className="text-slate-400">VALID_TIME:</span> <span className="text-emerald-400">2026-11-10T10:05:00Z</span></div>
              <div><span className="text-slate-400">SYS_TIME:</span> <span className="text-slate-400">2026-11-10T10:05:02Z</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-cyan-500/20">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#ff0055]"></span> Outage Cells</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#ffaa00]"></span> CSR Bottleneck</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-1 bg-rose-500 shadow-[0_0_6px_#ff0055]"></span> Failing Fiber (94.2% Drop)</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-1 border-t-2 border-dashed border-amber-400"></span> Standby Microwave</span>
        </div>
        <span className="text-cyan-400/80">[CLICK NODE TO PROBE]</span>
      </div>
    </div>
  );
}

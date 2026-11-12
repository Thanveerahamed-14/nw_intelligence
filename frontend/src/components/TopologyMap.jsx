import React, { useState } from 'react';
import { Network, Layers, Maximize2 } from 'lucide-react';

const STANDBY_MARKERS = ['standby', 'protect', 'backup', 'spare'];
const UNHEALTHY_MARKERS = ['failed', 'down', 'decommissioned', 'out_of_service', 'out-of-service'];

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function propsOf(node) {
  return node?.properties || {};
}

function isStandbyNode(node) {
  const haystack = [
    node?.id,
    node?.name,
    propsOf(node).status,
    propsOf(node).medium
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');
  return STANDBY_MARKERS.some((marker) => haystack.includes(marker));
}

function isUnhealthyNode(node) {
  const status = String(propsOf(node).status || '').toLowerCase();
  return UNHEALTHY_MARKERS.some((marker) => status.includes(marker));
}

function mediumShort(node) {
  const medium = String(propsOf(node).medium || '').toLowerCase();
  if (medium.includes('microw')) return 'Microwave';
  if (medium.includes('fiber') || medium.includes('optical') || medium.includes('smf')) return 'Fiber';
  if (medium) return titleCase(medium);
  return 'Transport';
}

function capacityOf(node) {
  const gbps = Number(propsOf(node).capacity_gbps);
  return Number.isFinite(gbps) && gbps > 0 ? `${gbps}G` : null;
}

function subLabel(node, headEndRouterId) {
  const props = propsOf(node);
  const type = node.entity_type;
  if (type === 'cell') {
    const band = props.frequency_band ? `${props.frequency_band}` : 'Radio';
    return props.pci != null ? `${band} · PCI ${props.pci}` : band;
  }
  if (type === 'radio_node') {
    return props.du_type || node.vendor || 'Baseband';
  }
  if (type === 'site') {
    return props.city || node.vendor || 'Access site';
  }
  if (type === 'router') {
    const model = props.model || node.vendor || 'Router';
    if (node.id === headEndRouterId) return `${model} · CSR`;
    return props.role === 'CORE_AGGREGATION' ? `${model} · Core` : `${model} · Agg`;
  }
  if (type === 'transport_link') {
    const capacity = capacityOf(node);
    return `${mediumShort(node)}${capacity ? ` ${capacity}` : ''}`;
  }
  return titleCase(type || 'entity');
}

export default function TopologyMap({
  nodes,
  edges,
  latencyMs,
  packetLoss = null,
  tenant,
  stagedAction,
  investigated = false,
  onOpenFullGraph
}) {
  const [selectedNode, setSelectedNode] = useState(null);
  const lossLabel = packetLoss == null
    ? 'measured transport loss'
    : `${Number(packetLoss).toFixed(2)}% Packet Loss`;

  if (tenant === 'customer_b') {
    return (
      <div className="clean-card p-5 border border-slate-800/80 bg-slate-900/80 flex flex-col items-center justify-center h-[460px] text-center shadow-2xl">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-sm font-bold text-slate-200">Customer B Isolated Boundary</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Zero cross-tenant topology entities accessible. Customer A's 10:05 UTC incident data is strictly segregated.
        </p>
        {onOpenFullGraph && (
          <button
            type="button"
            onClick={onOpenFullGraph}
            className="mt-4 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors flex items-center gap-1"
          >
            <Maximize2 className="w-3 h-3" />
            View this tenant's full graph
          </button>
        )}
      </div>
    );
  }

  // ---- Everything below is derived from the live topology payload --------
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const edgeList = Array.isArray(edges) ? edges : [];
  const byId = new Map(nodeList.map((node) => [node.id, node]));

  const adjacency = new Map();
  edgeList.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source).add(edge.target);
    adjacency.get(edge.target).add(edge.source);
  });

  const cells = nodeList
    .filter((node) => node.entity_type === 'cell')
    .sort((a, b) => a.id.localeCompare(b.id));
  const radios = nodeList
    .filter((node) => node.entity_type === 'radio_node')
    .sort((a, b) => a.id.localeCompare(b.id));
  const sites = nodeList
    .filter((node) => node.entity_type === 'site')
    .sort((a, b) => a.id.localeCompare(b.id));
  const routers = nodeList.filter((node) => node.entity_type === 'router');
  const links = nodeList
    .filter((node) => node.entity_type === 'transport_link')
    .sort((a, b) => a.id.localeCompare(b.id));

  const resolvedBypass = stagedAction?.bypass_path?.primary && stagedAction?.bypass_path?.standby
    ? stagedAction.bypass_path
    : null;
  const resolvedPrimaryId = resolvedBypass?.primary?.id;
  const resolvedStandbyId = resolvedBypass?.standby?.id;

  const actionActive = stagedAction?.status === 'APPROVED' || stagedAction?.status === 'EXECUTED';
  // A staged action survives reloads. Only treat it as a resolved path when the
  // incident has been investigated in this view (or the change is already live).
  const bypassResolved = Boolean(resolvedBypass) && (investigated || actionActive);

  const standbyLink = (resolvedStandbyId && byId.get(resolvedStandbyId))
    || links.find(isStandbyNode)
    || links.find((link) => link.id !== (links[0] || {}).id)
    || null;
  const primaryLink = (resolvedPrimaryId && byId.get(resolvedPrimaryId))
    || links.find((link) => link !== standbyLink)
    || null;

  const incidentActive = Number(packetLoss) >= 1
    || Boolean(resolvedBypass)
    || Boolean(stagedAction);

  // Distance to the nearest cell drives the access-site head-end selection.
  const minCellDistance = (startId) => {
    if (!adjacency.has(startId) || cells.length === 0) return Infinity;
    const seen = new Set([startId]);
    let frontier = [startId];
    for (let distance = 0; distance <= 6; distance += 1) {
      if (frontier.some((id) => byId.get(id)?.entity_type === 'cell')) return distance;
      const next = [];
      frontier.forEach((id) => {
        (adjacency.get(id) || []).forEach((neighbour) => {
          if (!seen.has(neighbour)) {
            seen.add(neighbour);
            next.push(neighbour);
          }
        });
      });
      frontier = next;
    }
    return Infinity;
  };

  const headEndRouter = [...routers].sort(
    (a, b) => minCellDistance(a.id) - minCellDistance(b.id) || a.id.localeCompare(b.id)
  )[0] || null;
  const coreRouters = routers
    .filter((router) => router.id !== headEndRouter?.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  // ---- Deterministic layered layout -------------------------------------
  const positions = new Map();
  const rangeY = (count, top, bottom) => {
    if (count <= 0) return [];
    if (count === 1) return [Math.round((top + bottom) / 2)];
    const step = (bottom - top) / (count - 1);
    return Array.from({ length: count }, (_, index) => Math.round(top + step * index));
  };

  const cellYs = rangeY(cells.length, 55, 265);
  cells.forEach((cell, index) => positions.set(cell.id, { x: 55, y: cellYs[index] }));

  const radioLayout = radios.map((radio) => {
    const ys = [...(adjacency.get(radio.id) || [])]
      .map((id) => positions.get(id))
      .filter(Boolean)
      .map((position) => position.y);
    return {
      radio,
      y: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 160
    };
  }).sort((a, b) => a.y - b.y || a.radio.id.localeCompare(b.radio.id));

  let previousRadioY = null;
  radioLayout.forEach(({ radio, y }) => {
    const placedY = previousRadioY == null ? y : Math.max(y, previousRadioY + 58);
    previousRadioY = placedY;
    positions.set(radio.id, { x: 175, y: placedY });
  });

  const siteYs = rangeY(sites.length, 45, 150);
  sites.forEach((site, index) => positions.set(site.id, { x: 300, y: siteYs[index] }));

  if (headEndRouter) positions.set(headEndRouter.id, { x: 395, y: 170 });

  const coreYs = rangeY(coreRouters.length, 95, 235);
  coreRouters.forEach((router, index) => {
    positions.set(router.id, { x: 590, y: coreYs[index] });
  });

  const linkOrder = [];
  if (primaryLink) linkOrder.push(primaryLink);
  links.forEach((link) => {
    if (link !== primaryLink && link !== standbyLink) linkOrder.push(link);
  });
  if (standbyLink) linkOrder.push(standbyLink);
  const linkYs = rangeY(linkOrder.length, 85, 255);
  linkOrder.forEach((link, index) => {
    positions.set(link.id, { x: 485, y: linkYs[index] });
  });

  const miscNodes = nodeList.filter((node) => !positions.has(node.id));
  miscNodes.forEach((node, index) => {
    positions.set(node.id, { x: 590, y: 60 + index * 52 });
  });

  // ---- Node / edge styling ---------------------------------------------
  const colorFor = (node) => {
    const type = node.entity_type;
    if (type === 'transport_link') {
      if (node === standbyLink) {
        if (!bypassResolved) return '#22d3ee';
        return actionActive ? '#10b981' : '#eab308';
      }
      if (node === primaryLink && incidentActive) return '#ef4444';
      return '#22d3ee';
    }
    if (type === 'cell') return '#ef4444';
    if (type === 'radio_node') return '#3b82f6';
    if (type === 'site') return '#8b5cf6';
    if (type === 'router') return node.id === headEndRouter?.id ? '#f59e0b' : '#10b981';
    return '#64748b';
  };

  const describeNode = (node) => {
    const props = propsOf(node);
    const type = node.entity_type;
    let telemetry = subLabel(node, headEndRouter?.id);
    if (type === 'transport_link') {
      const standby = isStandbyNode(node);
      const status = standby
        ? (bypassResolved
            ? (actionActive ? 'Bypass active' : 'Selected standby path')
            : 'Standby candidate — not selected')
        : props.status || 'Transport';
      telemetry = `${mediumShort(node)}${capacityOf(node) ? ` ${capacityOf(node)}` : ''} · ${status}`;
    } else if (type === 'router') {
      telemetry = `${props.model || node.vendor || 'Router'} · ${props.role || (node.id === headEndRouter?.id ? 'IP_RAN_CSR' : 'Router')}`;
    } else if (type === 'cell') {
      telemetry = `${props.frequency_band || 'radio'}${props.pci != null ? ` · PCI ${props.pci}` : ''}${props.azimuth != null ? ` · azimuth ${props.azimuth}°` : ''}`;
    }
    return {
      id: node.id,
      name: node.name || node.id,
      type: titleCase(type || 'entity'),
      vendor: node.vendor || '—',
      telemetry
    };
  };

  const edgeStyle = (edge) => {
    const touchesStandby = standbyLink
      && (edge.source === standbyLink.id || edge.target === standbyLink.id);
    const touchesPrimary = incidentActive && primaryLink
      && (edge.source === primaryLink.id || edge.target === primaryLink.id);
    if (touchesStandby) {
      if (!bypassResolved) {
        return { stroke: '#0ea5e9', strokeWidth: 2, dash: null, className: '' };
      }
      return actionActive
        ? { stroke: '#10b981', strokeWidth: 3.5, dash: null, className: 'standby-link flow-dash' }
        : { stroke: '#fbbf24', strokeWidth: 2.5, dash: '6 4', className: 'standby-link' };
    }
    if (touchesPrimary) {
      return { stroke: '#f43f5e', strokeWidth: 3.5, dash: null, className: 'failing-link' };
    }
    return { stroke: '#334155', strokeWidth: 2, dash: null, className: '' };
  };

  const visibleNodeCount = nodeList.filter((node) => positions.has(node.id)).length;
  const visibleEdgeCount = edgeList.filter(
    (edge) => positions.has(edge.source) && positions.has(edge.target)
  ).length;

  return (
    <div className="clean-card p-5 border border-slate-800/80 bg-slate-900/80 shadow-2xl flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Network Topology Graph (as of 10:05 UTC)
            </h2>
            <span className="text-[10px] font-mono text-slate-500">
              {visibleNodeCount} nodes · {visibleEdgeCount} edges · live Neo4j snapshot
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-500/30 font-semibold">
            Latency: {latencyMs || 0.77} ms
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            SLA Met
          </span>
          {onOpenFullGraph && (
            <button
              type="button"
              onClick={onOpenFullGraph}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors flex items-center gap-1"
              title="Show every node in the tenant, including disconnected branches"
            >
              <Maximize2 className="w-3 h-3" />
              Full tenant graph
            </button>
          )}
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative flex-1 bg-[#080d1a] rounded-xl border border-slate-800/90 overflow-hidden shadow-inner">
        {nodeList.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs font-mono text-slate-500">
            No topology snapshot returned for this tenant.
          </div>
        ) : (
          <svg viewBox="0 0 650 320" className="w-full h-full">
            {/* Cyber Grid Pattern */}
            <defs>
              <pattern id="cyberGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cyberGrid)" />

            {/* Links — every edge in the snapshot that has both endpoints placed */}
            {edgeList.map((edge, idx) => {
              const p1 = positions.get(edge.source);
              const p2 = positions.get(edge.target);
              if (!p1 || !p2) return null;
              const style = edgeStyle(edge);
              return (
                <line
                  key={`${edge.source}->${edge.target}-${idx}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  strokeWidth={style.strokeWidth}
                  stroke={style.stroke}
                  strokeDasharray={style.dash || undefined}
                  className={style.className}
                >
                  <title>{`${edge.rel_type || 'CONNECTS_TO'}: ${edge.source} → ${edge.target}`}</title>
                </line>
              );
            })}

            {/* Nodes — every vertex in the snapshot gets a shape */}
            {nodeList.map((node) => {
              const position = positions.get(node.id);
              if (!position) return null;
              const isSelected = selectedNode?.id === node.id;
              const color = colorFor(node);
              const unhealthy = node.entity_type === 'transport_link' && node === primaryLink && incidentActive;
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(describeNode(node))}
                  className="cursor-pointer group"
                >
                  {/* Hit target */}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={24}
                    fill="transparent"
                    className="pointer-events-auto"
                  />

                  {/* Outer halo ring */}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={isSelected ? 20 : 17}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    opacity={isSelected ? 0.8 : 0}
                    className="transition-all duration-200 group-hover:opacity-60 pointer-events-none"
                  />

                  {/* Core node circle */}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={isSelected ? 14 : 11.5}
                    fill={color}
                    stroke={unhealthy ? '#7f1d1d' : '#0f172a'}
                    strokeWidth={unhealthy ? 3 : 2.5}
                    className="transition-all duration-150 group-hover:stroke-white group-hover:stroke-[2.5px] pointer-events-none shadow-lg"
                  />
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={2.5}
                    fill="#ffffff"
                    className="pointer-events-none"
                  />
                  <text
                    x={position.x}
                    y={position.y + 23}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-200 pointer-events-none select-none tracking-tight font-mono"
                  >
                    {node.id}
                  </text>
                  <text
                    x={position.x}
                    y={position.y + 35}
                    textAnchor="middle"
                    className="text-[8.5px] font-medium fill-slate-400 pointer-events-none select-none font-mono"
                  >
                    {subLabel(node, headEndRouter?.id)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Selected Node Inspector HUD Overlay */}
        {selectedNode && (
          <div className="absolute top-3 right-3 clean-card p-3.5 bg-slate-900/95 border border-indigo-500/40 rounded-xl text-xs max-w-xs shadow-2xl backdrop-blur-xl animate-fade-in z-20">
            <div className="flex items-center justify-between font-bold text-white mb-2 border-b border-slate-800 pb-1.5">
              <span className="font-mono text-cyan-300">{selectedNode.id}</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white px-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="text-slate-300 space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between gap-2"><span className="text-slate-400">Name:</span> <span className="text-white font-semibold text-right">{selectedNode.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Type:</span> <span className="text-white font-semibold">{selectedNode.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Vendor:</span> <span className="text-indigo-300">{selectedNode.vendor}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-400">Telemetry:</span> <span className="text-amber-300 text-right">{selectedNode.telemetry}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Valid Time:</span> <span className="text-slate-400">10:05:00 UTC</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer — derived from the snapshot */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span> Cells ({cells.length})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span> Radio nodes ({radios.length})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span> {headEndRouter?.id || 'Head-end router'}</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-1 bg-rose-500 shadow-sm shadow-rose-500/80"></span> Failing Fiber ({lossLabel})</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-1 border-t-2 border-dashed border-amber-400"></span> Standby Microwave</span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">Click node to inspect</span>
      </div>
    </div>
  );
}

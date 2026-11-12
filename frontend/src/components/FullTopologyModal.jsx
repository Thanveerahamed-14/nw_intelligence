import React, { useEffect, useMemo, useState } from 'react';
import { Network, X, Layers, Database, Activity, AlertTriangle, Boxes } from 'lucide-react';

const TYPE_COLORS = {
  cell: '#ef4444',
  radio_node: '#3b82f6',
  site: '#8b5cf6',
  router: '#10b981',
  transport_link: '#22d3ee'
};

const TYPE_ORDER = ['router', 'transport_link', 'radio_node', 'site', 'cell'];

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function colorFor(node) {
  // The tenant graph API exposes `entity_type` (not `type`). Using the
  // wrong field silently sent every node through the slate fallback, making
  // the full graph's type colour key inaccurate.
  if (node.entity_type === 'router' && node.id === 'CSR_ALPHA_01') return '#f59e0b';
  return TYPE_COLORS[node.entity_type] || '#64748b';
}

/**
 * Deterministic BFS layout per weakly-connected component.
 * Level 0 is the most central vertex (the incident CSR when present), each
 * subsequent BFS level moves one column right. Nodes inside a level are
 * stacked vertically in stable ID order, so layout is reproducible.
 */
function layoutComponent(component, adjacency) {
  const memberIds = component.node_ids || [];
  const degrees = (id) => (adjacency.get(id) || new Set()).size;
  const root = memberIds.includes('CSR_ALPHA_01')
    ? 'CSR_ALPHA_01'
    : [...memberIds].sort(
      (a, b) => degrees(b) - degrees(a) || a.localeCompare(b)
    )[0];

  const level = new Map();
  if (root) {
    level.set(root, 0);
    const queue = [root];
    while (queue.length > 0) {
      const id = queue.shift();
      const neighbours = [...(adjacency.get(id) || [])].sort();
      neighbours.forEach((neighbour) => {
        if (!level.has(neighbour)) {
          level.set(neighbour, level.get(id) + 1);
          queue.push(neighbour);
        }
      });
    }
  }
  memberIds.forEach((id) => {
    if (!level.has(id)) level.set(id, 0);
  });

  const byLevel = new Map();
  memberIds.forEach((id) => {
    const l = level.get(id);
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l).push(id);
  });

  const positions = new Map();
  const levelX = 168;
  const nodeY = 80;
  byLevel.forEach((ids, l) => {
    [...ids].sort().forEach((id, index) => {
      positions.set(id, { x: l * levelX, y: index * nodeY });
    });
  });

  let maxX = 0;
  let maxY = 0;
  positions.forEach(({ x, y }) => {
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return { positions, width: maxX, height: maxY };
}

function buildLayout(components, adjacency) {
  const pad = 62;
  const gap = 74;
  const startX = 24;
  const startY = 24;
  let cursorX = startX;

  const placed = components.map((component) => {
    const local = layoutComponent(component, adjacency);
    const boxX = cursorX;
    const boxY = startY;
    const boxW = local.width + pad * 2;
    const boxH = local.height + pad + 46;

    const positions = new Map();
    local.positions.forEach(({ x, y }, id) => {
      positions.set(id, { x: boxX + pad + x, y: boxY + pad + y });
    });

    cursorX += boxW + gap;
    return { component, boxX, boxY, boxW, boxH, positions };
  });

  const totalW = Math.max(cursorX - gap + startX, 420);
  const totalH = Math.max(
    ...placed.map((p) => p.boxY + p.boxH + startY),
    260
  );
  return { placed, totalW, totalH };
}

export function FullTopologyContent({ snapshot, loading, error, tenant, onClose }) {
  const [selectedNode, setSelectedNode] = useState(null);

  const model = useMemo(() => {
    if (!snapshot) return null;
    const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
    const edges = Array.isArray(snapshot.edges) ? snapshot.edges : [];
    const components = Array.isArray(snapshot.components) ? snapshot.components : [];

    const adjacency = new Map();
    nodes.forEach((node) => adjacency.set(node.id, new Set()));
    edges.forEach((edge) => {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
      adjacency.get(edge.source).add(edge.target);
      adjacency.get(edge.target).add(edge.source);
    });

    const { placed, totalW, totalH } = buildLayout(components, adjacency);
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const componentById = new Map(components.map((comp) => [comp.id, comp]));

    const globalPositions = new Map();
    placed.forEach((p) => {
      p.positions.forEach((position, id) => globalPositions.set(id, position));
    });

    const inventory = [...nodes].sort((a, b) => {
      const ca = a.component_id || 0;
      const cb = b.component_id || 0;
      if (ca !== cb) return ca - cb;
      const ta = TYPE_ORDER.indexOf(a.entity_type);
      const tb = TYPE_ORDER.indexOf(b.entity_type);
      if (ta !== tb) return (ta < 0 ? 99 : ta) - (tb < 0 ? 99 : tb);
      return String(a.id).localeCompare(String(b.id));
    });

    return {
      nodes,
      edges,
      components,
      placed,
      totalW,
      totalH,
      nodeById,
      componentById,
      globalPositions,
      inventory,
      incidentComponentId: components.find((c) => c.is_incident_component)?.id
    };
  }, [snapshot]);

  const selectedMeta = selectedNode && model
    ? {
      node: model.nodeById.get(selectedNode),
      component: model.componentById.get(model.nodeById.get(selectedNode)?.component_id)
    }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="clean-card w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 font-sans text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white">Full Tenant Topology</h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold font-mono">
                  {tenant || 'customer_a'}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold font-mono">
                  as of 10:05 UTC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Complete entity inventory — every node and relationship, including branches disconnected from the incident.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary tiles */}
        {model && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-cyan-400" /> Nodes
              </span>
              <p className="text-xl font-bold font-mono text-white">{snapshot.node_count}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Relationships
              </span>
              <p className="text-xl font-bold font-mono text-white">{snapshot.edge_count}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Components
              </span>
              <p className="text-xl font-bold font-mono text-white">{snapshot.component_count}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" /> Snapshot latency
              </span>
              <p className="text-xl font-bold font-mono text-white">
                {snapshot.latency_ms}<span className="text-xs text-slate-400"> ms</span>
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 text-xs font-mono text-slate-500">
            Loading tenant snapshot…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {model && !loading && !error && (
          <>
            {/* Graph canvas */}
            <div className="relative rounded-xl bg-[#080d1a] border border-slate-800/90 overflow-auto shadow-inner full-topology-canvas">
              {model.nodes.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs font-mono text-slate-500">
                  No topology entities returned for this tenant.
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${model.totalW} ${model.totalH}`}
                  style={{ minWidth: Math.min(model.totalW, 1600), height: 'auto', width: '100%' }}
                  className="block"
                >
                  <defs>
                    <pattern id="fullGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.7" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#fullGrid)" />

                  {/* Component boxes + labels */}
                  {model.placed.map(({ component, boxX, boxY, boxW, boxH }) => {
                    const isolated = !component.is_incident_component;
                    return (
                      <g key={`comp-${component.id}`}>
                        <rect
                          x={boxX}
                          y={boxY}
                          width={boxW}
                          height={boxH}
                          rx={14}
                          fill={isolated ? 'rgba(120,53,15,0.10)' : 'rgba(15,23,42,0.55)'}
                          stroke={isolated ? '#f59e0b' : '#334155'}
                          strokeWidth={1.4}
                          strokeDasharray={isolated ? '6 4' : undefined}
                          className={`full-topology-component-box${isolated ? ' full-topology-component-isolated' : ''}`}
                        />
                        <text
                          x={boxX + 14}
                          y={boxY + 24}
                          className="text-[10px] font-bold fill-slate-300 font-mono"
                        >
                          {`Component ${component.id} · ${isolated ? 'Disconnected branch' : 'Incident component'}`}
                        </text>
                        <text
                          x={boxX + 14}
                          y={boxY + 38}
                          className={`text-[9px] font-mono ${isolated ? 'fill-amber-400' : 'fill-slate-500'}`}
                        >
                          {`${component.node_count} nodes · ${component.edge_count} edges${
                            isolated
                              ? (model.incidentComponentId
                                ? ' · not reachable from CSR_ALPHA_01'
                                : ' · no incident component in tenant')
                              : ''
                          }`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Edges */}
                  {model.edges.map((edge, index) => {
                    const p1 = model.globalPositions.get(edge.source);
                    const p2 = model.globalPositions.get(edge.target);
                    if (!p1 || !p2) return null;
                    return (
                      <line
                        key={`edge-${edge.source}-${edge.target}-${index}`}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        className="full-topology-edge"
                        stroke="#334155"
                        strokeWidth={2}
                      >
                        <title>{`${edge.rel_type || 'CONNECTS_TO'}: ${edge.source} → ${edge.target}`}</title>
                      </line>
                    );
                  })}

                  {/* Nodes */}
                  {model.inventory.map((node) => {
                    const position = model.globalPositions.get(node.id);
                    if (!position) return null;
                    const isSelected = selectedNode === node.id;
                    const color = colorFor(node);
                    return (
                      <g
                        key={`node-${node.id}`}
                        onClick={() => setSelectedNode(node.id)}
                        className="cursor-pointer group"
                      >
                        <circle cx={position.x} cy={position.y} r={22} fill="transparent" className="pointer-events-auto" />
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={isSelected ? 17 : 13}
                          fill={color}
                          stroke="#0f172a"
                          strokeWidth={2.5}
                          className="transition-all duration-150 group-hover:stroke-white"
                        />
                        <circle cx={position.x} cy={position.y} r={2.5} fill="#ffffff" />
                        <text
                          x={position.x}
                          y={position.y + 26}
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-slate-200 font-mono select-none"
                        >
                          {node.id}
                        </text>
                        <text
                          x={position.x}
                          y={position.y + 38}
                          textAnchor="middle"
                          className="text-[8.5px] fill-slate-400 font-mono select-none"
                        >
                          {titleCase(node.entity_type)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Selected node inspector */}
              {selectedMeta?.node && (
                <div className="absolute top-3 right-3 clean-card p-3.5 bg-slate-900/95 border border-indigo-500/40 rounded-xl text-xs max-w-xs shadow-2xl backdrop-blur-xl z-20">
                  <div className="flex items-center justify-between font-bold text-white mb-2 border-b border-slate-800 pb-1.5">
                    <span className="font-mono text-cyan-300">{selectedMeta.node.id}</span>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="text-slate-400 hover:text-white px-1 font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-slate-300 space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between gap-2"><span className="text-slate-400">Name:</span> <span className="text-white font-semibold text-right">{selectedMeta.node.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Type:</span> <span className="text-white font-semibold">{titleCase(selectedMeta.node.entity_type)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Vendor:</span> <span className="text-indigo-300">{selectedMeta.node.vendor || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Component:</span> <span className="text-white font-semibold">{selectedMeta.node.component_id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Degree:</span> <span className="text-white font-semibold">{selectedMeta.node.degree}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.cell }}></span> Cell</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.radio_node }}></span> Radio node</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.site }}></span> Site</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.router }}></span> Router</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Incident CSR</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS.transport_link }}></span> Transport link</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3 border border-dashed border-amber-500"></span> Disconnected component</span>
            </div>

            {/* Node inventory */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" /> Node inventory
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {model.inventory.length} entities · every node in the tenant snapshot
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400">
                    <tr className="text-left">
                      <th className="py-2 px-3 font-semibold">Entity ID</th>
                      <th className="py-2 px-3 font-semibold">Type</th>
                      <th className="py-2 px-3 font-semibold">Vendor</th>
                      <th className="py-2 px-3 font-semibold">Component</th>
                      <th className="py-2 px-3 font-semibold text-right">Degree</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 full-topology-inventory">
                    {model.inventory.map((node) => {
                      const isIncident = node.component_id === model.incidentComponentId;
                      return (
                        <tr
                          key={`inv-${node.id}`}
                          onClick={() => setSelectedNode(node.id)}
                          className="cursor-pointer hover:bg-slate-900/70"
                        >
                          <td className="py-1.5 px-3 text-cyan-300 font-bold">{node.id}</td>
                          <td className="py-1.5 px-3 text-slate-300">{titleCase(node.entity_type)}</td>
                          <td className="py-1.5 px-3 text-slate-400">{node.vendor || '—'}</td>
                          <td className="py-1.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isIncident
                                ? 'bg-slate-800 text-slate-300 border-slate-700'
                                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                            }`}>
                              {node.component_id}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-300">{node.degree}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {model.incidentComponentId ? (
                <>
                  This is the tenant-wide snapshot. The incident topology card is bounded to the component reachable from
                  {' '}<span className="font-mono text-slate-300">CSR_ALPHA_01</span>, so disconnected branches such as the
                  {' '}<span className="font-mono text-amber-300">CELL_099 → SITE_BETA</span> control fixture appear only here.
                </>
              ) : (
                <>
                  This tenant has no incident component. Every returned entity is isolated from Customer A&apos;s incident
                  topology — cross-tenant isolation is enforced at the snapshot query.
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function FullTopologyModal({ isOpen, onClose, tenant }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    fetch(`/api/v1/topology/graph?tenant_id=${encodeURIComponent(tenant || 'customer_a')}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Topology snapshot failed (HTTP ${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load topology snapshot');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, tenant]);

  if (!isOpen) return null;

  return (
    <FullTopologyContent
      snapshot={snapshot}
      loading={loading}
      error={error}
      tenant={tenant}
      onClose={onClose}
    />
  );
}

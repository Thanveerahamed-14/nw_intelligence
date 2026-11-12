import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  XCircle,
  Info,
  Lock,
  Wifi
} from 'lucide-react';

const RESTORED_STATUS = 'Restored via Standby Bypass';

function parsePct(value) {
  const parsed = parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mediumLabel(node) {
  const medium = String(node?.properties?.medium || '').toLowerCase();
  if (medium.includes('microw')) return 'MICROWAVE';
  if (medium.includes('fiber') || medium.includes('smf') || medium.includes('optical')) return 'FIBER';
  if (medium) return titleCase(medium).toUpperCase();
  return String(node?.entity_type || 'TRANSPORT').replace(/_/g, ' ').toUpperCase();
}

function capacityLabel(node) {
  const gbps = Number(node?.properties?.capacity_gbps);
  return Number.isFinite(gbps) ? `${gbps}G` : null;
}

function isStandbyLink(node) {
  const haystack = [
    node?.id,
    node?.name,
    node?.properties?.status,
    node?.properties?.medium
  ].join(' ').toLowerCase();
  return haystack.includes('standby') || haystack.includes('protect') || haystack.includes('microwav');
}

/**
 * Physical failover schematic for the incident.
 *
 * Node identities, layers, and edges come from the Neo4j topology neighbourhood;
 * live KPI values and the staged action only drive state/colour/labels. Nothing
 * here is drawn from the LLM and no Customer-A entity IDs are hardcoded.
 */
export default function IncidentPathStrip({
  theme = 'dark',
  stagedAction,
  report,
  topology,
  availability,
  packetLoss,
  onApprove,
  onReject,
  role,
  onRequestApproval
}) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);

  const isApproved = stagedAction?.status === 'APPROVED' || stagedAction?.status === 'EXECUTED';
  const isPending = stagedAction?.status === 'PENDING_APPROVAL';
  const isOperator = role === 'human_operator';

  const summary = report?.kpi_summary || {};
  const availabilityValue = parsePct(availability) ?? parsePct(summary.cell_availability);
  const packetLossValue = parsePct(packetLoss) ?? parsePct(summary.csr_packet_loss);
  const availabilityLabel = availabilityValue == null
    ? 'availability not measured'
    : `${availabilityValue.toFixed(2)}% Avail`;
  const lossLabel = packetLossValue == null
    ? 'loss not measured'
    : `${packetLossValue.toFixed(2)}% Loss`;

  const nodes = Array.isArray(topology?.nodes) ? topology.nodes : [];
  const edges = Array.isArray(topology?.edges) ? topology.edges : [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const affectedIds = new Set(report?.affected_entities || []);

  // Undirected adjacency for layout/classification only.
  const adjacency = new Map();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source).add(edge.target);
    adjacency.get(edge.target).add(edge.source);
  });

  const cells = nodes.filter((n) => n.entity_type === 'cell').sort((a, b) => a.id.localeCompare(b.id));
  const radios = nodes.filter((n) => n.entity_type === 'radio_node').sort((a, b) => a.id.localeCompare(b.id));
  const routers = nodes.filter((n) => n.entity_type === 'router');
  const sites = nodes.filter((n) => n.entity_type === 'site');
  const links = nodes.filter((n) => n.entity_type === 'transport_link');
  // The resolver runs server-side and attaches the verified path to the staged
  // action. The UI renders that decision; it only falls back to topology
  // heuristics for legacy actions that predate the resolver.
  const resolvedBypass = stagedAction?.bypass_path?.primary && stagedAction?.bypass_path?.standby
    ? stagedAction.bypass_path
    : null;
  const resolvedPrimaryId = resolvedBypass?.primary?.id;
  const resolvedStandbyId = resolvedBypass?.standby?.id;
  const primaryLink = (resolvedPrimaryId && byId.get(resolvedPrimaryId))
    || links.find((link) => !isStandbyLink(link))
    || links[0]
    || null;
  const standbyLink = (resolvedStandbyId && byId.get(resolvedStandbyId))
    || links.find((link) => isStandbyLink(link))
    || links.find((link) => link !== primaryLink)
    || null;
  const capacityAssessment = resolvedBypass?.capacity || null;
  const capacityConstrained = capacityAssessment?.sufficient_for_full_load === false;
  const pathChecks = resolvedBypass?.checks || [];
  const passedPathChecks = pathChecks.filter((check) => check.passed).length;
  const resolvedPathLabel = resolvedBypass?.path?.length
    ? resolvedBypass.path.join(' → ')
    : 'no connected standby path';

  const minCellDistance = (startId) => {
    if (!adjacency.has(startId) || cells.length === 0) return Infinity;
    const seen = new Set([startId]);
    let frontier = [startId];
    for (let distance = 0; distance <= 5; distance += 1) {
      if (frontier.some((id) => cells.some((cell) => cell.id === id))) return distance;
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
    (a, b) => minCellDistance(a.id) - minCellDistance(b.id)
  )[0] || null;
  const coreRouters = routers.filter((router) => router.id !== headEndRouter?.id);
  const siteNode = [...sites].sort((a, b) => {
    const count = (node) => (adjacency.get(node.id)?.size || 0);
    return count(b) - count(a);
  })[0] || null;

  // ---- Deterministic layered layout -------------------------------------
  const positions = new Map();
  const rangeY = (count, top, bottom) => {
    if (count <= 0) return [];
    if (count === 1) return [Math.round((top + bottom) / 2)];
    const step = (bottom - top) / (count - 1);
    return Array.from({ length: count }, (_, index) => Math.round(top + step * index));
  };

  const cellYs = rangeY(cells.length, 75, 195);
  cells.forEach((cell, index) => positions.set(cell.id, { x: 75, y: cellYs[index] }));

  const radioLayout = radios.map((radio) => {
    const ys = [...(adjacency.get(radio.id) || [])]
      .map((id) => positions.get(id))
      .filter(Boolean)
      .map((position) => position.y);
    return {
      radio,
      y: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 125
    };
  }).sort((a, b) => a.y - b.y);
  let previousY = null;
  radioLayout.forEach(({ radio, y }) => {
    const placedY = previousY == null ? y : Math.max(y, previousY + 56);
    previousY = placedY;
    positions.set(radio.id, { x: 200, y: placedY });
  });

  if (headEndRouter) positions.set(headEndRouter.id, { x: 330, y: 125 });

  const coreYs = rangeY(coreRouters.length, 80, 170);
  coreRouters.forEach((router, index) => {
    positions.set(router.id, { x: 845, y: coreYs[index] });
  });

  const linkOrder = [];
  if (primaryLink) linkOrder.push(primaryLink);
  links.forEach((link) => {
    if (link !== primaryLink && link !== standbyLink) linkOrder.push(link);
  });
  if (standbyLink) linkOrder.push(standbyLink);
  const linkYs = rangeY(linkOrder.length, 55, 195);
  linkOrder.forEach((link, index) => {
    positions.set(link.id, { x: 585, y: linkYs[index] });
  });

  const miscNodes = nodes.filter(
    (node) => !positions.has(node.id) && node.entity_type !== 'site'
  );
  miscNodes.forEach((node, index) => {
    positions.set(node.id, { x: 720, y: 65 + index * 55 });
  });

  const accessPositions = [...cells, ...radios]
    .map((node) => positions.get(node.id))
    .filter(Boolean);
  const accessMinY = accessPositions.length ? Math.min(...accessPositions.map((p) => p.y)) : 75;
  const accessMaxY = accessPositions.length ? Math.max(...accessPositions.map((p) => p.y)) : 195;
  const boundary = accessPositions.length
    ? {
        x: 15,
        y: Math.max(18, accessMinY - 52),
        width: radios.length ? 245 : 175,
        height: accessMaxY - Math.max(18, accessMinY - 52) + 36
      }
    : null;

  // ---- Node state descriptions ------------------------------------------
  const describeNode = (node) => {
    const type = node.entity_type;
    const props = node.properties || {};
    const isLink = type === 'transport_link';
    const isStandby = isLink && isStandbyLink(node);
    const medium = mediumLabel(node);
    const capacity = capacityLabel(node);
    const capacityText = capacity ? `${capacity} ` : '';

    let status = titleCase(props.status || 'Operational');
    let telemetry = 'No telemetry samples recorded for this entity.';
    let healthy = true;

    if (type === 'cell') {
      const inScope = affectedIds.size === 0 || affectedIds.has(node.id);
      status = isApproved
        ? RESTORED_STATUS
        : inScope ? `Major Service Outage (${availabilityLabel})` : 'Nominal Service';
      telemetry = isApproved
        ? `Traffic restored via ${standbyLink ? mediumLabel(standbyLink) : 'standby path'} • RRC success nominal`
        : inScope
          ? `No uplink traffic • ${availabilityLabel} measured by the KPI engine`
          : 'Cell operating within threshold.';
      healthy = isApproved || !inScope;
    } else if (type === 'radio_node') {
      const servedCells = [...(adjacency.get(node.id) || [])]
        .filter((id) => byId.get(id)?.entity_type === 'cell');
      status = isApproved ? 'Carrying Restored Traffic' : 'Online (Downstream Cells Degraded)';
      telemetry = `Hosts ${servedCells.length} cell(s) • ${node.vendor || 'unknown vendor'} ${props.du_type || ''}`.trim();
      healthy = isApproved;
    } else if (type === 'router') {
      const isHeadEnd = node.id === headEndRouter?.id;
      status = isApproved
        ? 'Online (Bypass Active)'
        : isHeadEnd ? 'Online (Choke Point Bottleneck)' : 'Operational';
      telemetry = isHeadEnd
        ? (isApproved
            ? `Traffic shifted to ${standbyLink?.id || 'standby path'}`
            : `Buffer saturation on transport path • ${lossLabel}`)
        : `Aggregation gateway • ${links.length} transport path(s) • ${props.model || node.vendor || 'unknown model'}`;
      healthy = true;
    } else if (isLink) {
      if (isStandby) {
        status = isApproved
          ? 'ACTIVE BACKHAUL CARRIER'
          : isPending ? 'ARMED & READY FOR CUTOVER' : 'STANDBY PROTECTION READY';
        telemetry = `${medium} ${capacityText}standby • configured (${props.status || 'standby'}) • no incident telemetry on this path`;
        healthy = true;
      } else {
        status = isApproved ? 'BYPASSED & ISOLATED' : 'CRITICAL LINK FAILURE';
        telemetry = `${medium} ${capacityText}transport degraded • ${lossLabel} measured by the KPI engine`;
        healthy = false;
      }
    } else if (type === 'site') {
      status = 'Operational';
      telemetry = `Access site • ${radios.length} radio node(s) • ${cells.length} cell(s) • ${node.vendor || 'unknown vendor'}`;
    } else {
      telemetry = `${medium} • ${props.status || 'no state recorded'}`;
    }

    return {
      id: node.id,
      name: `${node.id} — ${node.name || node.id}`,
      type: titleCase(type || 'entity'),
      vendor: node.vendor || '—',
      status,
      telemetry,
      healthy
    };
  };

  const linkPathStyle = (link) => {
    const isStandby = link === standbyLink;
    if (isStandby) {
      return {
        stroke: isApproved ? '#10b981' : isPending ? '#fbbf24' : '#0284c7',
        strokeWidth: isApproved ? 3.5 : 2.5,
        strokeDasharray: isApproved ? undefined : '6 4',
        filter: isApproved ? 'url(#glowGreen)' : isPending ? 'url(#glowAmber)' : 'none',
        className: isApproved || isPending ? 'flow-dash' : ''
      };
    }
    return {
      stroke: isApproved ? '#475569' : '#ef4444',
      strokeWidth: isApproved ? 1.8 : 3.5,
      strokeDasharray: isApproved ? '4 4' : undefined,
      filter: isApproved ? 'none' : 'url(#glowRed)',
      className: isApproved ? '' : 'pulse-danger'
    };
  };

  const edgeStyle = (edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    const link = [source, target].find((node) => node?.entity_type === 'transport_link');
    if (link) return linkPathStyle(link);

    const edgeCells = [source, target].filter((node) => node?.entity_type === 'cell');
    const affected = edgeCells.length === 0
      || edgeCells.some((cell) => affectedIds.size === 0 || affectedIds.has(cell.id));
    if (isApproved) return { stroke: '#10b981', strokeWidth: 2, filter: 'none', className: 'flow-dash' };
    if (!affected) return { stroke: '#334155', strokeWidth: 1.8, filter: 'none', className: '' };
    return { stroke: '#f43f5e', strokeWidth: 2, filter: 'none', className: '' };
  };

  const primaryMedium = primaryLink ? mediumLabel(primaryLink) : 'TRANSPORT';
  const standbyMedium = standbyLink ? mediumLabel(standbyLink) : 'STANDBY';

  const headEndPosition = headEndRouter ? positions.get(headEndRouter.id) : null;
  const primaryPosition = primaryLink ? positions.get(primaryLink.id) : null;
  const standbyPosition = standbyLink ? positions.get(standbyLink.id) : null;
  const primaryCore = primaryLink
    ? edges
        .filter((edge) => edge.source === primaryLink.id || edge.target === primaryLink.id)
        .map((edge) => (edge.source === primaryLink.id ? edge.target : edge.source))
        .map((id) => positions.get(id))
        .find((position) => position && position.x > (primaryPosition?.x || 0))
    : null;
  const standbyCore = standbyLink
    ? edges
        .filter((edge) => edge.source === standbyLink.id || edge.target === standbyLink.id)
        .map((edge) => (edge.source === standbyLink.id ? edge.target : edge.source))
        .map((id) => positions.get(id))
        .find((position) => position && position.x > (standbyPosition?.x || 0))
    : null;

  const detailRow = (label, value, valueClass = 'text-slate-300') => (
    <div className="flex justify-between gap-3 text-slate-300">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`${valueClass} text-right`}>{value ?? '—'}</span>
    </div>
  );

  return (
    <div className="clean-card mb-4 bg-slate-900/95 border border-slate-800/90 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300">

      {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isApproved ? 'bg-emerald-400' : isPending ? 'bg-amber-400' : 'bg-rose-500'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isApproved ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-rose-500'
            }`}></span>
          </span>

          <span className="font-bold text-slate-100 tracking-wider uppercase text-[11px] font-mono flex items-center gap-1.5">
            <span>Physical Topology Bypass Graph</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
              Live Neo4j failover schematic
            </span>
          </span>

          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full font-mono border ${
            isApproved
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
              : isPending
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
          }`}>
            {isApproved
              ? `✓ ${standbyMedium} BYPASS ACTIVE`
              : isPending
              ? '⚠️ FAILOVER PROPOSAL READY'
              : `CRITICAL ${primaryMedium} PATH FAILURE (${lossLabel})`}
          </span>

          {capacityConstrained && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono border bg-amber-950/80 text-amber-300 border-amber-500/40"
              title={capacityAssessment?.summary}
            >
              CAPACITY {capacityAssessment.standby_gbps}G / {capacityAssessment.primary_gbps}G
            </span>
          )}
        </div>

        {/* Right meta controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
            Click any node to inspect telemetry
          </span>

          <button
            onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/80 transition-colors"
            title="Toggle Detailed Physical Telemetry Drawer"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showTelemetryDetails ? 'Hide Diagnostics' : 'Circuit Diagnostics'}</span>
            {showTelemetryDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE NETWORK GRAPH CANVAS (SVG TOPOLOGY CIRCUIT) */}
      <div className={`topology-canvas relative p-3 bg-gradient-to-b from-[#080d1a] to-[#0b1329] overflow-hidden`}>
        {nodes.length === 0 ? (
          <div className="flex h-[210px] items-center justify-center text-center text-xs text-slate-400">
            <div>
              <div className="font-semibold text-slate-300">Topology snapshot unavailable</div>
              <div className="mt-1 font-mono text-[10px] text-slate-500">
                No graph neighbourhood returned for this tenant.
              </div>
            </div>
          </div>
        ) : (
          <svg
            viewBox="0 0 940 250"
            data-theme={theme}
            className="incident-network-svg w-full h-auto max-h-[300px] select-none filter drop-shadow-md"
          >
            <defs>
              <pattern id="bypassGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" />
              </pattern>

              <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="100%" height="100%" fill="url(#bypassGrid)" />

            {/* ACCESS SITE BOUNDARY (derived from the site entity in the snapshot) */}
            {boundary && (
              <g
                className={`network-site-boundary ${siteNode ? 'cursor-pointer group' : ''}`}
                onClick={siteNode ? () => setSelectedNode(describeNode(siteNode)) : undefined}
              >
                <rect
                  x={boundary.x}
                  y={boundary.y}
                  width={boundary.width}
                  height={boundary.height}
                  rx="12"
                  fill="rgba(15, 23, 42, 0.6)"
                  stroke="rgba(71, 85, 105, 0.4)"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <text
                  x={boundary.x + 13}
                  y={boundary.y + 18}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {siteNode?.name || 'ACCESS SITE'}
                </text>
                <text
                  x={boundary.x + 13}
                  y={boundary.y + 30}
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {cells.length} cells • {radios.length} radio nodes
                </text>
              </g>
            )}

            {/* CIRCUIT LINKS (EDGES) — drawn from snapshot edges */}
            {edges.map((edge) => {
              const start = positions.get(edge.source);
              const end = positions.get(edge.target);
              if (!start || !end) return null;
              const style = edgeStyle(edge);
              return (
                <path
                  key={`${edge.source}->${edge.target}`}
                  d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  fill="none"
                  strokeOpacity="0.9"
                  strokeDasharray={style.strokeDasharray}
                  filter={style.filter}
                  className={style.className}
                >
                  <title>{`${edge.rel_type || 'CONNECTS_TO'}: ${edge.source} → ${edge.target}`}</title>
                </path>
              );
            })}

            {/* Failure marker on the primary path when the incident is active */}
            {!isApproved && primaryLink && headEndPosition && primaryPosition && (
              <g transform={`translate(${Math.round((headEndPosition.x + primaryPosition.x) / 2)}, ${Math.round((headEndPosition.y + primaryPosition.y) / 2)})`}>
                <circle cx="0" cy="0" r="14" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="4" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">✕</text>
              </g>
            )}

            {/* Active data pulses on the standby path when it is carrying traffic */}
            {isApproved && headEndPosition && standbyPosition && (
              <g>
                <circle
                  cx={Math.round((headEndPosition.x + standbyPosition.x) / 2)}
                  cy={Math.round((headEndPosition.y + standbyPosition.y) / 2)}
                  r="4"
                  fill="#6ee7b7"
                  filter="url(#glowGreen)"
                />
                {standbyCore && (
                  <circle
                    cx={Math.round((standbyPosition.x + standbyCore.x) / 2)}
                    cy={Math.round((standbyPosition.y + standbyCore.y) / 2)}
                    r="4"
                    fill="#6ee7b7"
                    filter="url(#glowGreen)"
                  />
                )}
              </g>
            )}

            {/* CIRCUIT NODES — every vertex in the snapshot gets a shape */}
            {cells.map((cell, index) => {
              const position = positions.get(cell.id);
              if (!position) return null;
              const inScope = affectedIds.size === 0 || affectedIds.has(cell.id);
              const healthy = isApproved || !inScope;
              return (
                <g
                  key={cell.id}
                  className="network-cell cursor-pointer group"
                  onClick={() => setSelectedNode(describeNode(cell))}
                  transform={`translate(${position.x}, ${position.y})`}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="18"
                    fill={healthy ? '#064e3b' : '#450a0a'}
                    stroke={healthy ? '#10b981' : '#f43f5e'}
                    strokeWidth="2"
                  />
                  <text x="0" y="4" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {String(index + 1).padStart(2, '0')}
                  </text>
                  <text x="0" y="27" fill={healthy ? '#a7f3d0' : '#fda4af'} fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {cell.id}
                  </text>
                </g>
              );
            })}

            {radios.map((radio) => {
              const position = positions.get(radio.id);
              if (!position) return null;
              return (
                <g
                  key={radio.id}
                  className="network-radio cursor-pointer group"
                  onClick={() => setSelectedNode(describeNode(radio))}
                  transform={`translate(${position.x}, ${position.y})`}
                >
                  <rect
                    x="-28"
                    y="-16"
                    width="56"
                    height="32"
                    rx="8"
                    fill="#082f49"
                    stroke={isApproved ? '#10b981' : '#0ea5e9'}
                    strokeWidth="1.8"
                  />
                  <text x="0" y="-2" fill="#bae6fd" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    RADIO
                  </text>
                  <text x="0" y="10" fill="#fff" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {radio.id}
                  </text>
                  <text x="0" y="26" fill="#7dd3fc" fontSize="7" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {radio.vendor || ''}
                  </text>
                </g>
              );
            })}

            {headEndRouter && positions.get(headEndRouter.id) && (
              <g
                className="network-router cursor-pointer group"
                onClick={() => setSelectedNode(describeNode(headEndRouter))}
                transform={`translate(${positions.get(headEndRouter.id).x}, ${positions.get(headEndRouter.id).y})`}
              >
                <rect x="-42" y="-24" width="84" height="48" rx="10" fill="#042f2e" stroke="#14b8a6" strokeWidth="2" />
                <text x="0" y="-4" fill="#5eead4" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                  ROUTER
                </text>
                <text x="0" y="9" fill="#fff" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                  {headEndRouter.id}
                </text>
                <text x="0" y="34" fill="#99f6e4" fontSize="7.5" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                  {headEndRouter.properties?.model || headEndRouter.vendor || ''}
                </text>
              </g>
            )}

            {linkOrder.map((link) => {
              const position = positions.get(link.id);
              if (!position) return null;
              const standby = link === standbyLink;
              const capacity = capacityLabel(link);
              const topLine = `${standby ? 'STANDBY' : 'PRIMARY'} ${mediumLabel(link)}${capacity ? ` · ${capacity}` : ''}`;
              const bottomLine = standby
                ? (isApproved ? '✅ DIVERTER ACTIVE' : isPending ? '⚡ REROUTE ARMED' : 'STANDBY READY')
                : (isApproved ? 'BYPASSED / OFF-LINE' : `❌ ${lossLabel.toUpperCase()}`);
              return (
                <g
                  key={link.id}
                  className={`network-link ${standby ? 'network-standby' : 'network-primary'} cursor-pointer group`}
                  onClick={() => setSelectedNode(describeNode(link))}
                  transform={`translate(${position.x}, ${position.y})`}
                >
                  <rect
                    x="-90"
                    y="-19"
                    width="180"
                    height="38"
                    rx="8"
                    fill={standby
                      ? (isApproved ? '#064e3b' : isPending ? '#451a03' : '#082f49')
                      : (isApproved ? '#1e293b' : '#450a0a')}
                    stroke={standby
                      ? (isApproved ? '#10b981' : isPending ? '#f59e0b' : '#0284c7')
                      : (isApproved ? '#475569' : '#ef4444')}
                    strokeWidth="1.6"
                  />
                  <text
                    x="0"
                    y="-3"
                    fill={standby
                      ? (isApproved ? '#a7f3d0' : isPending ? '#fde68a' : '#bae6fd')
                      : (isApproved ? '#94a3b8' : '#fca5a5')}
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {topLine}
                  </text>
                  <text
                    x="0"
                    y="10"
                    fill={standby
                      ? (isApproved ? '#fff' : isPending ? '#fbbf24' : '#7dd3fc')
                      : (isApproved ? '#64748b' : '#fff')}
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {bottomLine}
                  </text>
                  <text
                    x="0"
                    y="24"
                    fill="#64748b"
                    fontSize="7"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {link.id}
                  </text>
                </g>
              );
            })}

            {coreRouters.map((router) => {
              const position = positions.get(router.id);
              if (!position) return null;
              return (
                <g
                  key={router.id}
                  className="network-core cursor-pointer group"
                  onClick={() => setSelectedNode(describeNode(router))}
                  transform={`translate(${position.x}, ${position.y})`}
                >
                  <rect x="-40" y="-24" width="80" height="48" rx="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
                  <text x="0" y="-4" fill="#c7d2fe" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    AGGREGATION
                  </text>
                  <text x="0" y="9" fill="#fff" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {router.id}
                  </text>
                  <text x="0" y="34" fill="#a5b4fc" fontSize="7.5" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {router.properties?.model || router.vendor || ''}
                  </text>
                </g>
              );
            })}

            {miscNodes.map((node) => {
              const position = positions.get(node.id);
              if (!position) return null;
              return (
                <g
                  key={node.id}
                  className="network-misc cursor-pointer group"
                  onClick={() => setSelectedNode(describeNode(node))}
                  transform={`translate(${position.x}, ${position.y})`}
                >
                  <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#64748b" strokeWidth="1.6" />
                  <text x="0" y="3" fill="#e2e8f0" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {String(node.entity_type || 'NODE').slice(0, 4).toUpperCase()}
                  </text>
                  <text x="0" y="24" fill="#94a3b8" fontSize="7" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {node.id}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* OVERLAY TELEMETRY INSPECTOR HUD (WHEN A NODE IS CLICKED) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 max-w-sm p-3.5 bg-slate-900/95 border border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-xl animate-fade-in text-xs font-sans text-slate-100">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-bold font-mono text-cyan-300">
                <Info className="w-3.5 h-3.5" />
                <span>{selectedNode.name}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white px-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between"><span className="text-slate-400">Layer Type:</span> <span className="text-white">{selectedNode.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Vendor / Model:</span> <span className="text-slate-300">{selectedNode.vendor}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operational State:</span>
                <span className={selectedNode.healthy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {selectedNode.status}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 text-slate-300">
                <span className="text-slate-400 block mb-0.5">Physical Telemetry:</span>
                <span className="text-slate-200">{selectedNode.telemetry}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2b. DETERMINISTIC PATH RESOLUTION SUMMARY — always visible, not LLM-generated */}
      {resolvedBypass && (
        <div className="px-4 py-1.5 bg-slate-950/70 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
          <span className={`flex items-center gap-1.5 ${resolvedBypass.feasible ? 'text-cyan-300' : 'text-rose-300'}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            {resolvedBypass.feasible ? 'Deterministic path verified' : 'No deterministic bypass path'} · {resolvedPathLabel}
          </span>
          {capacityAssessment && (
            <span className={capacityConstrained ? 'text-amber-300' : 'text-emerald-300'}>
              {capacityConstrained
                ? `Capacity constrained · ${capacityAssessment.standby_gbps}G / ${capacityAssessment.primary_gbps}G`
                : `Capacity verified · ${capacityAssessment.standby_gbps}G / ${capacityAssessment.primary_gbps}G`}
            </span>
          )}
        </div>
      )}

      {/* 3. COLLAPSIBLE CIRCUIT TELEMETRY DRAWER — values come from link properties + live KPIs */}
      {showTelemetryDetails && (
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800/90 text-xs">
          {linkOrder.length === 0 ? (
            <p className="text-xs text-slate-400">
              No transport links are present in this topology snapshot.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {resolvedBypass && (
                <div className="md:col-span-2 p-3 rounded-lg bg-slate-900/80 border border-cyan-800/60 space-y-1.5 font-mono text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Deterministic Bypass Resolution
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                      resolvedBypass.feasible
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    }`}>
                      {resolvedBypass.feasible ? 'PATH VERIFIED' : 'NO CONNECTED PATH'}
                    </span>
                  </div>

                  {resolvedBypass.path?.length > 0 &&
                    detailRow('Resolved Path', resolvedBypass.path.join(' → '), 'text-cyan-200')}
                  {pathChecks.length > 0 &&
                    detailRow(
                      'Rule Checks',
                      `${passedPathChecks}/${pathChecks.length} passed`,
                      passedPathChecks === pathChecks.length ? 'text-emerald-300' : 'text-amber-300'
                    )}
                  {capacityAssessment &&
                    detailRow(
                      'Capacity Check',
                      capacityAssessment.summary,
                      capacityConstrained ? 'text-amber-300' : 'text-emerald-300'
                    )}
                  <p className="text-[10px] leading-snug text-slate-500 pt-1">
                    {resolvedBypass.selection_rule}
                  </p>
                </div>
              )}

              {[primaryLink, ...linkOrder.filter((link) => link !== primaryLink && link !== standbyLink), standbyLink]
                .filter(Boolean)
                .map((link) => {
                  const standby = link === standbyLink;
                  return (
                    <div
                      key={link.id}
                      className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2 text-slate-400 font-bold pb-1 border-b border-slate-800">
                        <span className={`flex items-center gap-1 ${standby ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {standby ? <Wifi className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                          {standby ? 'Standby' : 'Primary'} {mediumLabel(link)} Diagnostics
                        </span>
                        <span className="truncate">{link.id}</span>
                      </div>
                      {detailRow('Physical Medium', link.properties?.medium || link.name)}
                      {detailRow('Capacity', capacityLabel(link) || 'not recorded')}
                      {detailRow('Configured State', link.properties?.status || 'not recorded')}
                      {detailRow('Vendor', link.vendor || '—')}
                      {standby
                        ? detailRow('Reroute Blast Radius', stagedAction?.blast_radius || 'not staged', 'text-slate-200')
                        : detailRow('Measured Packet Loss', lossLabel, 'text-rose-400 font-bold')}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 4. HITL ACTION FOOTER (AUTHORIZATION STRIP) */}
      <div className="px-4 py-2.5 bg-slate-950/95 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">
            Safety Gate: <strong className="text-slate-200 font-mono">HITL Tier-2 Sign-Off Required</strong>
          </span>
          {stagedAction && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              ID: {stagedAction.action_id}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {stagedAction && isPending && isOperator && (
            <>
              <button
                onClick={onReject}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-rose-300 border border-slate-700 hover:border-rose-500/40 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Reject Proposal</span>
              </button>

              <button
                onClick={() => onApprove()}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize {standbyMedium} Reroute</span>
              </button>
            </>
          )}

          {stagedAction && isPending && !isOperator && (
            <div className="approval-required flex flex-wrap items-center gap-2 text-[11px] font-semibold text-purple-200 bg-purple-950/60 border border-purple-500/40 px-3 py-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>
                <code className="approval-code font-mono bg-purple-900/80 px-1 rounded border border-purple-700">APPROVE_CHANGE</code>
                {' '}required
              </span>
              <button
                onClick={onRequestApproval}
                className="review-human-gate ml-1 flex items-center gap-1 rounded-md bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-all active:scale-95"
              >
                <span>Review in Human Gate</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {isApproved && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{standbyMedium} Bypass Active • Physical Telemetry Stabilizing</span>
            </div>
          )}

          {!stagedAction && (
            <span className="text-xs text-slate-400 font-mono">
              Ready for Agent Remediation Staging
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

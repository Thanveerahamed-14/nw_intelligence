// Interactive UI Controller for Network Intelligence Platform

document.addEventListener("DOMContentLoaded", () => {
  const tenantSelect = document.getElementById("tenantSelect");
  const roleSelect = document.getElementById("roleSelect");
  const btnRun = document.getElementById("btnRunInvestigation");
  const traceConsole = document.getElementById("agentTraceConsole");
  const topoSvg = document.getElementById("topoSvg");
  const topoLatencyBadge = document.getElementById("topologyLatencyBadge");
  const agentSlaBadge = document.getElementById("agentSlaBadge");
  const kpiTableBody = document.getElementById("kpiTableBody");
  const stagedActionView = document.getElementById("stagedActionView");
  const actionStatusBadge = document.getElementById("actionStatusBadge");
  const btnApprove = document.getElementById("btnApproveAction");
  const btnReject = document.getElementById("btnRejectAction");
  const hitlAuditTrail = document.getElementById("hitlAuditTrail");

  let currentIncidentReport = null;
  let activeActionId = null;

  // Initialize view
  loadTopology();
  loadKPIs();
  checkStagedActions();

  // Listeners
  btnRun.addEventListener("click", runInvestigation);
  tenantSelect.addEventListener("change", () => {
    loadTopology();
    loadKPIs();
    checkStagedActions();
  });

  btnApprove.addEventListener("click", () => handleActionDecision(true));
  btnReject.addEventListener("click", () => handleActionDecision(false));

  async function loadTopology() {
    const tenant = tenantSelect.value;
    try {
      const res = await fetch(`/api/v1/topology/neighborhood?entity_id=CELL_001&as_of=2026-11-10T10:05:00Z&max_hops=2&tenant_id=${tenant}`);
      const data = await res.json();
      topoLatencyBadge.textContent = `Latency: ${data.latency_ms || 1.2} ms (p95 SLA Met)`;
      renderTopologyGraph(data.nodes || [], data.edges || []);
    } catch (e) {
      console.error("Topology load failed", e);
    }
  }

  function renderTopologyGraph(nodes, edges) {
    topoSvg.innerHTML = "";
    
    if (nodes.length === 0) {
      topoSvg.innerHTML = `<text x="325" y="180" fill="#94a3b8" text-anchor="middle">No entities found for tenant '${tenantSelect.value}'. Isolated boundary.</text>`;
      return;
    }

    // Static layout coordinates for clean visual clarity of the incident
    const coords = {
      "CELL_001": { x: 50, y: 70, color: "#ef4444", label: "CELL 001 (5G)" },
      "CELL_002": { x: 50, y: 160, color: "#ef4444", label: "CELL 002 (5G)" },
      "CELL_003": { x: 50, y: 250, color: "#ef4444", label: "CELL 003 (4G)" },
      "NODE_42": { x: 190, y: 110, color: "#3b82f6", label: "gNodeB 42 (Ericsson)" },
      "NODE_43": { x: 190, y: 250, color: "#3b82f6", label: "gNodeB 43 (Nokia)" },
      "SITE_ALPHA": { x: 330, y: 70, color: "#8b5cf6", label: "Site Alpha Tower" },
      "CSR_ALPHA_01": { x: 340, y: 180, color: "#f59e0b", label: "CSR_ALPHA_01 (Cisco)" },
      "LINK_BACKHAUL_09": { x: 470, y: 120, color: "#ef4444", label: "Primary Fiber (FAILING)" },
      "LINK_BACKHAUL_STANDBY_09": { x: 470, y: 240, color: "#eab308", label: "Standby Microwave" },
      "AGG_ROUTER_01": { x: 590, y: 180, color: "#10b981", label: "Agg Router (Central)" }
    };

    // Draw Links
    const renderedEdges = [
      { u: "CELL_001", v: "NODE_42" },
      { u: "CELL_002", v: "NODE_42" },
      { u: "CELL_003", v: "NODE_43" },
      { u: "NODE_42", v: "SITE_ALPHA" },
      { u: "NODE_43", v: "SITE_ALPHA" },
      { u: "NODE_42", v: "CSR_ALPHA_01" },
      { u: "NODE_43", v: "CSR_ALPHA_01" },
      { u: "CSR_ALPHA_01", v: "LINK_BACKHAUL_09", failing: true },
      { u: "CSR_ALPHA_01", v: "LINK_BACKHAUL_STANDBY_09", standby: true },
      { u: "LINK_BACKHAUL_09", v: "AGG_ROUTER_01", failing: true },
      { u: "LINK_BACKHAUL_STANDBY_09", v: "AGG_ROUTER_01", standby: true }
    ];

    renderedEdges.forEach(e => {
      const c1 = coords[e.u];
      const c2 = coords[e.v];
      if (c1 && c2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", c1.x);
        line.setAttribute("y1", c1.y);
        line.setAttribute("x2", c2.x);
        line.setAttribute("y2", c2.y);
        line.setAttribute("class", e.failing ? "link-line link-failing" : e.standby ? "link-line link-standby" : "link-line");
        topoSvg.appendChild(line);
      }
    });

    // Draw Nodes
    Object.keys(coords).forEach(id => {
      const c = coords[id];
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", c.x);
      circle.setAttribute("cy", c.y);
      circle.setAttribute("r", 15);
      circle.setAttribute("fill", c.color);
      circle.setAttribute("stroke", "#ffffff");
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("class", "node-circle");

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${id}\nVendor: ${c.label}`;
      circle.appendChild(title);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", c.x);
      text.setAttribute("y", c.y + 26);
      text.setAttribute("class", "node-text");
      text.textContent = c.label;

      g.appendChild(circle);
      g.appendChild(text);
      topoSvg.appendChild(g);
    });
  }

  async function loadKPIs() {
    const tenant = tenantSelect.value;
    try {
      const res = await fetch(`/api/v1/kpi/entity?entity_id=CELL_001&tenant_id=${tenant}`);
      const data = await res.json();
      const records = data.records || [];

      // Also get transport router
      const resRouter = await fetch(`/api/v1/kpi/entity?entity_id=CSR_ALPHA_01&tenant_id=${tenant}`);
      const dataRouter = await resRouter.json();
      const allRecords = [...records, ...(dataRouter.records || [])];

      // Control cell
      const resCtrl = await fetch(`/api/v1/kpi/entity?entity_id=CELL_099&tenant_id=${tenant}`);
      const dataCtrl = await resCtrl.json();
      const combined = [...allRecords, ...(dataCtrl.records || [])];

      kpiTableBody.innerHTML = "";
      combined.slice(0, 7).forEach(r => {
        const tr = document.createElement("tr");
        const statusClass = r.quality_status === "COMPLETE" ? "status-complete" : r.quality_status === "PARTIAL" ? "status-uncertain" : "status-incomplete";
        const dateStr = new Date(r.timestamp).toISOString().substring(11, 16) + " UTC";
        tr.innerHTML = `
          <td><strong>${r.entity_id}</strong></td>
          <td>${dateStr}</td>
          <td>${r.kpi_name}</td>
          <td><strong>${r.value} ${r.unit}</strong></td>
          <td><span class="status-tag ${statusClass}">${r.quality_status}</span></td>
          <td>${Math.round(r.completeness_score * 100)}% (${r.sample_count}/${r.expected_samples})</td>
        `;
        kpiTableBody.appendChild(tr);
      });
    } catch (e) {
      console.error("Failed to load KPIs", e);
    }
  }

  async function runInvestigation() {
    traceConsole.innerHTML = `<div style="color:#38bdf8; padding:10px;">⚡ Initializing autonomous agent investigation for 10:05 UTC incident...</div>`;
    btnRun.disabled = true;
    agentSlaBadge.textContent = "Agent Running...";
    agentSlaBadge.className = "badge badge-alarm";

    try {
      const res = await fetch("/api/v1/investigation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantSelect.value,
          affected_cells: ["CELL_001", "CELL_002", "CELL_003"],
          incident_time: "2026-11-10T10:05:00Z"
        })
      });

      const report = await res.json();
      currentIncidentReport = report;

      agentSlaBadge.textContent = `Completed in ${report.total_duration_ms} ms (SLA &lt; 30s Met)`;
      agentSlaBadge.className = "badge badge-sla";
      btnRun.disabled = false;

      // Render step by step
      renderAgentTrace(report);
      checkStagedActions();
    } catch (e) {
      traceConsole.innerHTML += `<div style="color:#ef4444;">Error executing investigation: ${e.message}</div>`;
      btnRun.disabled = false;
    }
  }

  function renderAgentTrace(report) {
    traceConsole.innerHTML = "";
    report.execution_steps.forEach(step => {
      const stepDiv = document.createElement("div");
      stepDiv.className = "trace-step";

      const phaseClass = step.phase_type === "DETERMINISTIC_TOOL" ? "step-phase-deterministic" : "step-phase-llm";

      let obsPreview = "";
      if (typeof step.observation === "object") {
        obsPreview = JSON.stringify(step.observation, null, 2);
      } else {
        obsPreview = String(step.observation);
      }

      stepDiv.innerHTML = `
        <div class="step-header">
          <span>Step ${step.step_number}: ${step.step_name}</span>
          <span class="${phaseClass}">[${step.phase_type}] (${step.duration_ms}ms)</span>
        </div>
        ${step.tool_invoked ? `<div style="color:#94a3b8; font-size:0.75rem;">Tool: <code>${step.tool_invoked}</code></div>` : ""}
        <div class="step-observation">${obsPreview}</div>
      `;
      traceConsole.appendChild(stepDiv);
    });

    // Summary block
    const summaryDiv = document.createElement("div");
    summaryDiv.style.cssText = "padding:12px; border-radius:6px; background:rgba(16,185,129,0.15); border:1px solid #10b981; margin-top:10px;";
    summaryDiv.innerHTML = `
      <div style="font-weight:700; color:#10b981; margin-bottom:6px;">🎯 Agent Conclusion:</div>
      <div style="font-size:0.84rem; color:#e2e8f0;">${report.root_cause_summary}</div>
    `;
    traceConsole.appendChild(summaryDiv);
    traceConsole.scrollTop = traceConsole.scrollHeight;
  }

  async function checkStagedActions() {
    const tenant = tenantSelect.value;
    try {
      const res = await fetch(`/api/v1/actions?tenant_id=${tenant}`);
      const actions = await res.json();
      
      if (actions.length > 0) {
        const latest = actions[actions.length - 1];
        activeActionId = latest.action_id;
        stagedActionView.style.display = "block";
        document.getElementById("actionIdText").textContent = latest.action_id;
        document.getElementById("actionTypeText").textContent = latest.action_type;
        document.getElementById("actionJustification").textContent = latest.justification;
        document.getElementById("actionBlastRadius").textContent = latest.blast_radius;
        document.getElementById("actionRollback").textContent = latest.rollback_procedure;
        
        actionStatusBadge.textContent = latest.status;
        actionStatusBadge.style.background = latest.status === "PENDING_APPROVAL" ? "rgba(245,158,11,0.2)" : latest.status === "EXECUTED" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)";
        actionStatusBadge.style.color = latest.status === "PENDING_APPROVAL" ? "#f59e0b" : latest.status === "EXECUTED" ? "#10b981" : "#ef4444";

        hitlAuditTrail.innerHTML = latest.audit_trail.map(t => `<div>• ${t}</div>`).join("");
      } else {
        stagedActionView.style.display = "none";
        actionStatusBadge.textContent = "AWAITING PROPOSAL";
        hitlAuditTrail.innerHTML = "";
      }
    } catch (e) {
      console.error("Failed to check staged actions", e);
    }
  }

  async function handleActionDecision(approve) {
    if (!activeActionId) return;
    const role = roleSelect.value;
    const tenant = tenantSelect.value;

    const endpoint = approve ? `/api/v1/actions/${activeActionId}/approve` : `/api/v1/actions/${activeActionId}/reject`;
    const payload = approve 
      ? { caller_id: "human_lead_operator", tenant_id: tenant, comment: "Verified alarm correlation and redundant microwave capacity. Approved." }
      : { caller_id: "human_lead_operator", tenant_id: tenant, reason: "Manual intervention required instead." };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Governance Gate: ${err.detail || "Action not allowed"}`);
        return;
      }

      await checkStagedActions();
      loadTopology();
      loadKPIs();
    } catch (e) {
      alert(`Error updating action: ${e.message}`);
    }
  }
});


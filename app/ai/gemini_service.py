"""
AI Access Layer: Google Gemini / Vertex AI Integration.
Combines retrieved topology, KPI telemetry, and vector store runbooks
to generate incident diagnoses and remediation justifications.
"""

from typing import Dict, Any, List, Optional
import re
from queue import Empty, Queue
from threading import Thread

from app.config import settings


def _call_with_budget(fn, timeout_seconds: float):
    """Runs fn() on a daemon thread and returns None if it exceeds the budget.

    A synchronous LLM round-trip must never consume the whole agent SLA, so a
    timed-out call falls back to the deterministic engine.
    """
    results: "Queue" = Queue(maxsize=1)

    def worker():
        try:
            results.put((True, fn()))
        except Exception as exc:  # surfaced to the caller below
            results.put((False, exc))

    Thread(target=worker, daemon=True).start()
    try:
        ok, value = results.get(timeout=timeout_seconds)
    except Empty:
        return None
    if not ok:
        raise value
    return value


def _clean_conversational_preamble(text: str) -> str:
    """Strips conversational preambles like 'Here is the Root Cause Diagnosis...'."""
    cleaned = text.strip()
    # Strip leading phrases like "Here is the Root Cause Diagnosis... ---\n"
    cleaned = re.sub(
        r"^(?:Here is (?:the|a)\s+[^:\n]+:?\s*(?:---\s*)?)",
        "",
        cleaned,
        flags=re.IGNORECASE
    ).strip()
    # Strip leading horizontal rules
    cleaned = re.sub(r"^---\s*", "", cleaned).strip()
    return cleaned


def _extract_markdown_sections(text: str) -> Dict[str, str]:
    """Splits text by markdown headings like ### 1. Diagnosis / ### 2. Recommendation."""
    cleaned = _clean_conversational_preamble(text)
    sections: Dict[str, str] = {}
    current_key = "general"
    current_lines: List[str] = []

    for line in cleaned.splitlines():
        header_match = re.match(r"^#{1,4}\s*(?:\d+[\.\)]\s*)?([A-Za-z0-9_\s]+)", line.strip())
        if header_match:
            if current_lines:
                sections[current_key] = "\n".join(current_lines).strip()
                current_lines = []
            header_title = header_match.group(1).strip().lower()
            if "diagnosis" in header_title or "root cause" in header_title:
                current_key = "diagnosis"
            elif "recommendation" in header_title or "remediation" in header_title:
                current_key = "recommendation"
            elif "risk" in header_title:
                current_key = "risk_analysis"
            elif "window" in header_title:
                current_key = "suggested_window"
            elif "rollback" in header_title:
                current_key = "rollback_strategy"
            elif "check" in header_title or "flight" in header_title:
                current_key = "pre_flight_checks"
            else:
                current_key = header_title.replace(" ", "_")
        else:
            current_lines.append(line)

    if current_lines:
        sections[current_key] = "\n".join(current_lines).strip()

    return sections


class GeminiAIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.client = None
        self._init_client()

    def _init_client(self):
        if self.api_key and self.api_key.strip():
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key.strip())
            except Exception:
                self.client = None

    def is_ai_connected(self) -> bool:
        return self.client is not None and bool(self.api_key and self.api_key.strip())

    def get_status(self) -> Dict[str, Any]:
        return {
            "ai_provider": "Google Gemini" if self.is_ai_connected() else "Deterministic AI Fallback",
            "model": self.model_name,
            "connected": self.is_ai_connected(),
            "instructions": "Set GEMINI_API_KEY in .env to activate live Google Gemini LLM reasoning." if not self.is_ai_connected() else "Live Gemini AI active."
        }

    def generate_incident_synthesis(
        self,
        affected_cells: list[str],
        shared_dependencies: list[Dict[str, Any]],
        kpi_summary: Dict[str, Any],
        matched_runbooks: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes incident root cause using live Gemini API if key is present,
        or deterministic reasoning engine if offline.
        """
        prompt = (
            f"You are a Telecom Network Operations AI Lead investigating a critical incident.\n"
            f"Affected Cells: {affected_cells}\n"
            f"Shared Infrastructure: {[d.get('id') for d in shared_dependencies]}\n"
            f"Telemetry & KPI Observations: {kpi_summary}\n"
            f"Retrieved Vector Runbooks: {[r.get('id') + ': ' + r.get('document')[:100] for r in matched_runbooks]}\n\n"
            f"Instructions:\n"
            f"- DO NOT include conversational filler, intro statements, greetings, or pleasantries (e.g., do NOT start with 'Here is the Root Cause Diagnosis' or '---').\n"
            f"- Provide a direct, well-structured technical response with two distinct sections:\n\n"
            f"### 1. Root Cause Diagnosis\n"
            f"<Concise diagnosis of the physical/transport fault, referencing specific degraded metrics and affected cells>\n\n"
            f"### 2. Safe Remediation Recommendation\n"
            f"<Actionable remediation recommendation, remote verification checks, and standby traffic diversion steps>"
        )

        if self.is_ai_connected() and self.client:
            try:
                response = _call_with_budget(
                    lambda: self.client.models.generate_content(
                        model=self.model_name,
                        contents=prompt
                    ),
                    settings.LLM_REQUEST_TIMEOUT_SECONDS,
                )
                if response and response.text:
                    cleaned = _clean_conversational_preamble(response.text)
                    sections = _extract_markdown_sections(cleaned)
                    diagnosis = sections.get("diagnosis", cleaned)
                    recommendation = sections.get("recommendation", "")
                    return {
                        "root_cause": cleaned,
                        "diagnosis": diagnosis,
                        "recommendation": recommendation,
                        "engine_used": f"Google Gemini ({self.model_name})"
                    }
            except Exception:
                pass  # Fall back to deterministic synthesis

        # Deterministic Domain-Specific AI Synthesis
        shared_target = shared_dependencies[0]["name"] if shared_dependencies else "Transport Router"
        shared_id = shared_dependencies[0]["id"] if shared_dependencies else "CSR_ALPHA_01"
        runbook_ref = matched_runbooks[0]["id"] if matched_runbooks else "RCA-OPTICAL-001"
        availability = kpi_summary.get("cell_availability", "n/a")
        packet_loss = kpi_summary.get("csr_packet_loss", "n/a")

        diagnosis = (
            f"CORRELATED ROOT CAUSE CONFIRMED: Transport packet loss of {packet_loss} measured on shared "
            f"transport infrastructure '{shared_target}' (ID: {shared_id}) coincides with cell availability "
            f"of {availability} across cells {affected_cells}. This is consistent with upstream backhaul "
            f"degradation on the shared path affecting all dependent cells. "
            f"Referenced Vector Runbook: {runbook_ref}."
        )

        recommendation = (
            f"Remotely verify optical power levels and CRC error counters on {shared_id}. "
            f"Divert active cell traffic to redundant 10G Standby Microwave link to restore {len(affected_cells)} affected cell(s) "
            f"pending Human Operator sign-off."
        )

        full_text = f"### 1. Root Cause Diagnosis\n{diagnosis}\n\n### 2. Safe Remediation Recommendation\n{recommendation}"

        return {
            "root_cause": full_text,
            "diagnosis": diagnosis,
            "recommendation": recommendation,
            "engine_used": "Deterministic Telecom Reasoning Engine (Configure GEMINI_API_KEY in .env for live Gemini)"
        }

    def generate_change_risk_assessment(
        self,
        target_entity_id: str,
        change_type: str,
        affected_cells: list[str],
        estimated_subscribers: int,
        has_redundancy: bool,
        topology_nodes: list[Dict[str, Any]],
        calculated_risk: str
    ) -> Dict[str, Any]:
        """
        Synthesizes pre-change impact simulation, risk score, recommended maintenance window,
        and rollback strategy using Gemini AI (or domain deterministic fallback).
        """
        prompt = (
            f"You are a Telecom Change Advisory Board (CAB) AI Lead evaluating a production network change.\n"
            f"- Target Network Entity: {target_entity_id}\n"
            f"- Proposed Change Operation: {change_type}\n"
            f"- Downstream Cells: {affected_cells}\n"
            f"- Estimated Subscribers Impacted / Restored: ~{estimated_subscribers}\n"
            f"- Standby Redundancy Path: {'Available (Redundant Standby Microwave Link Verified)' if has_redundancy else 'NOT Available (Simplex Path)'}\n"
            f"- Topology Neighborhood Entities: {[n.get('id', '') + ' (' + n.get('entity_type', '') + ')' for n in topology_nodes[:8]]}\n\n"
            f"Instructions:\n"
            f"- DO NOT include conversational filler, intro statements, or greetings.\n"
            f"- Provide a professional, structured analysis with these exact sections:\n\n"
            f"### RISK ANALYSIS\n"
            f"<Synthesize blast radius, failover stability, and subscriber risk profile>\n\n"
            f"### SUGGESTED WINDOW\n"
            f"<Recommend execution timing (e.g. Immediate Emergency Window for active outages or 02:00-05:00 UTC Maintenance Window)>\n\n"
            f"### ROLLBACK STRATEGY\n"
            f"<Step-by-step procedure to revert routing if standby path latency/loss exceeds threshold>\n\n"
            f"### PRE-FLIGHT CHECKS\n"
            f"- <Check 1>\n"
            f"- <Check 2>\n"
            f"- <Check 3>"
        )

        if self.is_ai_connected() and self.client:
            try:
                response = _call_with_budget(
                    lambda: self.client.models.generate_content(
                        model=self.model_name,
                        contents=prompt
                    ),
                    settings.LLM_REQUEST_TIMEOUT_SECONDS,
                )
                if response and response.text:
                    cleaned = _clean_conversational_preamble(response.text)
                    sections = _extract_markdown_sections(cleaned)
                    
                    # Extract list items from pre_flight_checks section
                    checks_raw = sections.get("pre_flight_checks", "")
                    checks = [
                        re.sub(r"^[\*\-•\d\.\s]+", "", line).strip()
                        for line in checks_raw.splitlines()
                        if line.strip() and not line.strip().startswith("#")
                    ]
                    if not checks:
                        checks = [
                            f"Verify optical receive power and RF link margin on standby link before traffic shift.",
                            f"Snapshot BGP neighbor adjacency table and interface counters on {target_entity_id}.",
                            f"Require Tier-2 NOC Human Lead sign-off in the HITL approval gate."
                        ]

                    risk_analysis = sections.get("risk_analysis") or (
                        f"Change simulation for {change_type} on {target_entity_id}: Downstream impact reaches "
                        f"{len(affected_cells)} cell(s) (~{estimated_subscribers} subscribers). "
                        f"Redundancy is {'available on standby link; risk is contained' if has_redundancy else 'absent; simplex path'}. "
                        f"Requires Tier-2 NOC Lead sign-off."
                    )
                    suggested_window = sections.get("suggested_window") or (
                        "Immediate Emergency Window (P1 incident restoration; downtime active)"
                        if affected_cells else "Maintenance Window (02:00 - 05:00 UTC low-traffic hours)"
                    )
                    rollback = sections.get("rollback_strategy") or (
                        f"Re-enable primary optical backhaul interface on {target_entity_id} and flush BGP routes "
                        f"if standby link latency exceeds 15ms or packet loss exceeds 0.5%."
                    )

                    return {
                        "risk_level": calculated_risk,
                        "risk_analysis": risk_analysis,
                        "suggested_window": suggested_window,
                        "rollback_strategy": rollback,
                        "pre_flight_checks": checks[:4],
                        "recommendation": (
                            f"Change Impact Analysis for {change_type} on {target_entity_id}: "
                            f"Downstream impact reaches {len(affected_cells)} cells (~{estimated_subscribers} subscribers). "
                            f"Redundancy path is {'available (risk: LOW)' if has_redundancy else 'NOT available (risk: HIGH)'}. "
                            f"Requires Tier-2 NOC Human Lead approval before execution window."
                        ),
                        "engine_used": f"Google Gemini ({self.model_name})"
                    }
            except Exception:
                pass  # Fall back to deterministic

        # Deterministic Domain-Specific Change Assessment
        fallback_checks = [
            f"Verify standby microwave link optical/RF power and latency (<10ms) before committing route diversion.",
            f"Snapshot BGP neighbor routing tables and interface counters on {target_entity_id}.",
            f"Ensure NOC Human Operator is actively monitoring real-time telemetry stream in the HITL console."
        ]
        fallback_analysis = (
            f"Topology traversal identifies {len(affected_cells)} cell(s) (~{estimated_subscribers} subscribers) "
            f"relying on {target_entity_id}. Redundancy path is "
            f"{'verified active on standby microwave link; rerouting preserves service continuity.' if has_redundancy else 'absent; traffic diversion causes simplex outage.'} "
            f"Blast radius is bounded to {target_entity_id} downstream subnetwork."
        )
        fallback_window = (
            "Immediate Emergency Window (Active P1 Incident Recovery - Cell Downtime Active)"
            if affected_cells else "Standard Maintenance Window (02:00 - 05:00 UTC)"
        )
        fallback_rollback = (
            f"Re-enable primary optical backhaul interface on {target_entity_id} and flush BGP neighbor routes "
            f"if standby link latency exceeds 15ms or packet loss exceeds 0.5%."
        )

        return {
            "risk_level": calculated_risk,
            "risk_analysis": fallback_analysis,
            "suggested_window": fallback_window,
            "rollback_strategy": fallback_rollback,
            "pre_flight_checks": fallback_checks,
            "recommendation": (
                f"Change Impact Analysis for {change_type} on {target_entity_id}: "
                f"Downstream impact reaches {len(affected_cells)} cells (~{estimated_subscribers} subscribers). "
                f"Redundancy path is {'available (risk: LOW)' if has_redundancy else 'NOT available (risk: HIGH)'}. "
                f"Requires Tier-2 NOC Human Lead approval before execution window."
            ),
            "engine_used": "Deterministic Telecom Risk Engine (Configure GEMINI_API_KEY in .env for live Gemini)"
        }

# Global singleton
_gemini_instance: Optional[GeminiAIService] = None

def get_ai_service() -> GeminiAIService:
    global _gemini_instance
    if _gemini_instance is None:
        _gemini_instance = GeminiAIService()
    return _gemini_instance


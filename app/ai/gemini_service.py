"""
AI Access Layer: Google Gemini Integration.

Synthesis is attempted against a cascade of Gemini free-tier models. The first
model that returns usable text wins. Only when *every* candidate fails (retired
model, quota exhausted, timeout, service outage) does the system fall back to
the deterministic telecom reasoning engine -- and the fallback is always
reported back to the caller, never silently swallowed.
"""

import re
import time
from queue import Empty, Queue
from threading import Thread
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings

# HTTP status codes that mean "this model is unusable right now, try the next".
_TRANSIENT_STATUS = {429, 500, 502, 503, 504}
_RETRY_ONCE_STATUS = {500, 502, 503, 504}
_CODE_PATTERN = re.compile(r"\b(40\d|41\d|42\d|43\d|44\d|45\d|50\d)\b")

FALLBACK_NOTICE = "Gemini unavailable -- deterministic telecom reasoning engine used"


def _call_with_budget(fn, timeout_seconds: float):
    """Runs fn() on a daemon thread and raises TimeoutError if it overruns.

    A synchronous LLM round-trip must never consume the whole agent SLA, but a
    timeout is now an explicit, reported failure instead of a silent ``None``.
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
        raise TimeoutError(f"LLM call exceeded {timeout_seconds:.1f}s budget")
    if not ok:
        raise value
    return value


def _status_code(exc: Exception) -> Optional[int]:
    """Best-effort extraction of an HTTP status from a GenAI client error."""
    for attr in ("code", "status_code", "http_status"):
        value = getattr(exc, attr, None)
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.isdigit():
            return int(value)
    match = _CODE_PATTERN.search(str(exc))
    return int(match.group(1)) if match else None


def _classify_failure(exc: Exception) -> str:
    if isinstance(exc, TimeoutError):
        return "TIMEOUT"
    code = _status_code(exc)
    if code == 404:
        return "MODEL_RETIRED"
    if code == 429:
        return "QUOTA_EXHAUSTED"
    if code in (500, 502, 503, 504):
        return "SERVICE_UNAVAILABLE"
    if code == 403:
        return "PERMISSION_DENIED"
    if code == 400:
        return "INVALID_REQUEST"
    return "ERROR"


def _short_error(exc: Exception, limit: int = 220) -> str:
    text = " ".join(str(exc).split())
    return text[:limit]


def _clean_conversational_preamble(text: str) -> str:
    """Strips conversational preambles like 'Here is the Root Cause Diagnosis...'."""
    cleaned = text.strip()
    cleaned = re.sub(
        r"^(?:Here is (?:the|a)\s+[^:\n]+:?\s*(?:---\s*)?)",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    cleaned = re.sub(r"^---\s*", "", cleaned).strip()
    return cleaned


def _extract_markdown_sections(text: str) -> Dict[str, str]:
    """Splits text by markdown headings like ### 1. Diagnosis / ### 2. Recommendation."""
    cleaned = _clean_conversational_preamble(text)
    sections: Dict[str, str] = {}
    current_key = "general"
    current_lines: List[str] = []

    for line in cleaned.splitlines():
        stripped = line.strip()
        header_match = re.match(
            r"^#{1,4}\s*(?:\d+[\.\)]\s*)?([A-Za-z0-9_\s]+)", stripped
        )
        # Some models emit "**RISK ANALYSIS**" instead of a "###" heading.
        if not header_match:
            header_match = re.match(r"^\*\*([A-Za-z0-9_ &/\-]+)\*\*:?\s*$", stripped)
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
        self._last_call: Optional[Dict[str, Any]] = None
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

    def candidate_models(self) -> List[str]:
        """Configured model first, then the configured free-tier fallbacks."""
        ordered = [self.model_name] + settings.get_gemini_fallback_models()
        seen = set()
        models: List[str] = []
        for name in ordered:
            clean = (name or "").strip()
            if clean.startswith("models/"):
                clean = clean[len("models/"):]
            if clean and clean not in seen:
                seen.add(clean)
                models.append(clean)
        return models

    def get_status(self) -> Dict[str, Any]:
        connected = self.is_ai_connected()
        return {
            "ai_provider": "Google Gemini" if connected else "Deterministic Fallback",
            "model": self.model_name,
            "connected": connected,
            "model_cascade": self.candidate_models(),
            "last_call": self._last_call,
            "instructions": (
                "Live Gemini active."
                if connected
                else "Set GEMINI_API_KEY in .env to activate live Google Gemini LLM reasoning."
            ),
        }

    def probe(self) -> Dict[str, Any]:
        """Actively exercises the model cascade; used by the UI health check."""
        started = time.perf_counter()
        if not self.is_ai_connected():
            meta = self._fallback_meta(
                [], "No GEMINI_API_KEY configured"
            )
            meta["duration_ms"] = round((time.perf_counter() - started) * 1000, 2)
            self._last_call = meta
            return meta
        text, meta = self._generate_with_cascade("Reply with the single word OK")
        meta["duration_ms"] = round((time.perf_counter() - started) * 1000, 2)
        meta["sample"] = (text or "")[:40]
        self._last_call = meta
        return meta

    # ------------------------------------------------------------------
    # Model cascade
    # ------------------------------------------------------------------
    def _generate_with_cascade(self, prompt: str) -> Tuple[Optional[str], Dict[str, Any]]:
        if not self.is_ai_connected() or self.client is None:
            meta = self._fallback_meta([], "No GEMINI_API_KEY configured")
            self._last_call = meta
            return None, meta

        attempts: List[Dict[str, Any]] = []
        models = self.candidate_models()
        deadline = time.monotonic() + settings.LLM_TOTAL_BUDGET_SECONDS

        for model in models:
            retries = 1
            while retries >= 0:
                remaining = deadline - time.monotonic()
                if remaining <= 0.5:
                    attempts.append(
                        {
                            "model": model,
                            "status": "SKIPPED",
                            "error_type": "BUDGET_EXHAUSTED",
                            "error": "Total LLM budget exhausted before this model ran",
                            "latency_ms": 0.0,
                        }
                    )
                    break

                timeout = min(settings.LLM_REQUEST_TIMEOUT_SECONDS, remaining)
                started = time.perf_counter()
                try:
                    response = _call_with_budget(
                        lambda m=model: self.client.models.generate_content(
                            model=m, contents=prompt
                        ),
                        timeout,
                    )
                    text = (getattr(response, "text", "") or "").strip()
                    if not text:
                        raise ValueError("Gemini returned an empty response")
                    attempts.append(
                        {
                            "model": model,
                            "status": "SUCCESS",
                            "error_type": None,
                            "error": None,
                            "latency_ms": round(
                                (time.perf_counter() - started) * 1000, 2
                            ),
                        }
                    )
                    meta = {
                        "ai_status": "LIVE",
                        "model_used": model,
                        "attempts": attempts,
                        "fallback_reason": None,
                        "error_summary": None,
                    }
                    self._last_call = meta
                    return text, meta
                except Exception as exc:
                    kind = _classify_failure(exc)
                    attempts.append(
                        {
                            "model": model,
                            "status": "FAILED",
                            "error_type": kind,
                            "http_status": _status_code(exc),
                            "error": _short_error(exc),
                            "latency_ms": round(
                                (time.perf_counter() - started) * 1000, 2
                            ),
                        }
                    )
                    if kind == "SERVICE_UNAVAILABLE" and retries > 0:
                        retries -= 1
                        continue
                    break

        meta = self._fallback_meta(attempts, self._summarise_failures(attempts))
        self._last_call = meta
        return None, meta

    def _fallback_meta(
        self, attempts: List[Dict[str, Any]], reason: str
    ) -> Dict[str, Any]:
        return {
            "ai_status": "FALLBACK",
            "model_used": None,
            "attempts": attempts,
            "fallback_reason": reason,
            "error_summary": reason,
        }

    @staticmethod
    def _summarise_failures(attempts: List[Dict[str, Any]]) -> str:
        failures = [a for a in attempts if a.get("status") == "FAILED"]
        if not failures:
            return FALLBACK_NOTICE
        details = "; ".join(
            f"{a['model']} -> {a.get('error_type') or 'ERROR'}"
            + (f" ({a['http_status']})" if a.get("http_status") else "")
            for a in failures[:5]
        )
        return f"{FALLBACK_NOTICE}. Attempts: {details}"

    # ------------------------------------------------------------------
    # Incident synthesis
    # ------------------------------------------------------------------
    def generate_incident_synthesis(
        self,
        affected_cells: list[str],
        shared_dependencies: list[Dict[str, Any]],
        kpi_summary: Dict[str, Any],
        matched_runbooks: list[Dict[str, Any]],
    ) -> Dict[str, Any]:
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

        text, meta = self._generate_with_cascade(prompt)
        if text:
            cleaned = _clean_conversational_preamble(text)
            sections = _extract_markdown_sections(cleaned)
            return {
                "root_cause": cleaned,
                "diagnosis": sections.get("diagnosis", cleaned),
                "recommendation": sections.get("recommendation", ""),
                "engine_used": f"Google Gemini ({meta['model_used']})",
                **meta,
            }

        shared_target = (
            shared_dependencies[0]["name"] if shared_dependencies else "Transport Router"
        )
        shared_id = (
            shared_dependencies[0]["id"] if shared_dependencies else "CSR_ALPHA_01"
        )
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

        full_text = (
            f"### 1. Root Cause Diagnosis\n{diagnosis}\n\n"
            f"### 2. Safe Remediation Recommendation\n{recommendation}"
        )

        return {
            "root_cause": full_text,
            "diagnosis": diagnosis,
            "recommendation": recommendation,
            "engine_used": f"Deterministic Telecom Reasoning Engine ({meta['fallback_reason']})",
            **meta,
        }

    # ------------------------------------------------------------------
    # Change risk assessment
    # ------------------------------------------------------------------
    def generate_change_risk_assessment(
        self,
        target_entity_id: str,
        change_type: str,
        affected_cells: list[str],
        estimated_subscribers: int,
        has_redundancy: bool,
        topology_nodes: list[Dict[str, Any]],
        calculated_risk: str,
    ) -> Dict[str, Any]:
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

        text, meta = self._generate_with_cascade(prompt)
        if text:
            cleaned = _clean_conversational_preamble(text)
            sections = _extract_markdown_sections(cleaned)

            checks_raw = sections.get("pre_flight_checks", "")
            checks = []
            for line in checks_raw.splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("#"):
                    continue
                # Skip a duplicated bold section title (e.g. "**PRE-FLIGHT CHECKS**").
                if re.fullmatch(r"\*\*[^*]+\*\*:?", stripped):
                    continue
                # Strip only a real list marker, preserving **bold** emphasis.
                item = re.sub(r"^(?:[*\-•]|\d+[.)])\s+", "", stripped).strip()
                if item:
                    checks.append(item)
            if not checks:
                checks = [
                    "Verify optical receive power and RF link margin on standby link before traffic shift.",
                    f"Snapshot BGP neighbor adjacency table and interface counters on {target_entity_id}.",
                    "Require Tier-2 NOC Human Lead sign-off in the HITL approval gate.",
                ]

            risk_analysis = sections.get("risk_analysis") or (
                f"Change simulation for {change_type} on {target_entity_id}: Downstream impact reaches "
                f"{len(affected_cells)} cell(s) (~{estimated_subscribers} subscribers). "
                f"Redundancy is {'available on standby link; risk is contained' if has_redundancy else 'absent; simplex path'}. "
                f"Requires Tier-2 NOC Lead sign-off."
            )
            suggested_window = sections.get("suggested_window") or (
                "Immediate Emergency Window (P1 incident restoration; downtime active)"
                if affected_cells
                else "Maintenance Window (02:00 - 05:00 UTC low-traffic hours)"
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
                "engine_used": f"Google Gemini ({meta['model_used']})",
                **meta,
            }

        fallback_checks = [
            "Verify standby microwave link optical/RF power and latency (<10ms) before committing route diversion.",
            f"Snapshot BGP neighbor routing tables and interface counters on {target_entity_id}.",
            "Ensure NOC Human Operator is actively monitoring real-time telemetry stream in the HITL console.",
        ]
        fallback_analysis = (
            f"Topology traversal identifies {len(affected_cells)} cell(s) (~{estimated_subscribers} subscribers) "
            f"relying on {target_entity_id}. Redundancy path is "
            f"{'verified active on standby microwave link; rerouting preserves service continuity.' if has_redundancy else 'absent; traffic diversion causes simplex outage.'} "
            f"Blast radius is bounded to {target_entity_id} downstream subnetwork."
        )
        fallback_window = (
            "Immediate Emergency Window (Active P1 Incident Recovery - Cell Downtime Active)"
            if affected_cells
            else "Standard Maintenance Window (02:00 - 05:00 UTC)"
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
            "engine_used": f"Deterministic Telecom Risk Engine ({meta['fallback_reason']})",
            **meta,
        }


# Global singleton
_gemini_instance: Optional[GeminiAIService] = None


def get_ai_service() -> GeminiAIService:
    global _gemini_instance
    if _gemini_instance is None:
        _gemini_instance = GeminiAIService()
    return _gemini_instance

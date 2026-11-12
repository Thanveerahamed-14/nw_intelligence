"""
Deterministic tests for the Gemini model cascade and fallback reporting.

These tests never touch the network: the suite clears GEMINI_API_KEY in
``tests/__init__.py`` and the cascade tests inject a fake client.
"""

import unittest

from app.ai.gemini_service import GeminiAIService


class _FakeResponse:
    text = (
        "### 1. Root Cause Diagnosis\n"
        "Transport degradation measured on LINK_BACKHAUL_09.\n\n"
        "### 2. Safe Remediation Recommendation\n"
        "Divert traffic to the standby microwave path."
    )


class _FakeModels:
    def __init__(self):
        self.calls = []

    def generate_content(self, model, contents):
        self.calls.append(model)
        if model == "retired-model":
            error = RuntimeError("404 NOT_FOUND. This model is no longer available.")
            error.code = 404
            raise error
        return _FakeResponse()


class _FakeClient:
    def __init__(self):
        self.models = _FakeModels()


def _service_with_client(candidate_models):
    service = GeminiAIService()
    service.api_key = "test-key"
    service.client = _FakeClient()
    service.candidate_models = lambda: list(candidate_models)
    return service


class TestGeminiCascade(unittest.TestCase):
    def test_missing_key_reports_explicit_fallback(self):
        service = GeminiAIService()
        service.api_key = None
        service.client = None

        result = service.generate_incident_synthesis(
            affected_cells=["CELL_001"],
            shared_dependencies=[{"id": "CSR_ALPHA_01", "name": "Shared Router"}],
            kpi_summary={"cell_availability": "33.33%", "csr_packet_loss": "99.86%"},
            matched_runbooks=[],
        )

        self.assertEqual(result["ai_status"], "FALLBACK")
        self.assertEqual(result["attempts"], [])
        self.assertIsNone(result["model_used"])
        self.assertIn("No GEMINI_API_KEY", result["fallback_reason"])
        self.assertTrue(result["engine_used"].startswith("Deterministic"))
        # The deterministic narrative still uses the computed KPIs.
        self.assertIn("99.86%", result["diagnosis"])
        self.assertIn("33.33%", result["diagnosis"])

    def test_retired_model_fails_over_to_next_candidate(self):
        service = _service_with_client(["retired-model", "working-model"])

        result = service.generate_incident_synthesis(
            affected_cells=["CELL_001"],
            shared_dependencies=[{"id": "CSR_ALPHA_01", "name": "Shared Router"}],
            kpi_summary={"cell_availability": "33.33%", "csr_packet_loss": "99.86%"},
            matched_runbooks=[],
        )

        self.assertEqual(result["ai_status"], "LIVE")
        self.assertEqual(result["model_used"], "working-model")
        self.assertIsNone(result["fallback_reason"])
        self.assertEqual(service.client.models.calls, ["retired-model", "working-model"])
        self.assertEqual(result["attempts"][0]["status"], "FAILED")
        self.assertEqual(result["attempts"][0]["error_type"], "MODEL_RETIRED")
        self.assertEqual(result["attempts"][1]["status"], "SUCCESS")

    def test_all_models_failing_reports_every_attempt(self):
        service = _service_with_client(["retired-a", "retired-b"])
        # Make both candidates behave like retired models.
        service.candidate_models = lambda: ["retired-model", "retired-model-2"]
        service.client.models.generate_content = lambda model, contents: (_ for _ in ()).throw(
            type("E", (RuntimeError,), {"code": 404})("no longer available")
        )

        result = service.generate_change_risk_assessment(
            target_entity_id="CSR_ALPHA_01",
            change_type="REBOOT_BASEBAND_UNIT",
            affected_cells=["CELL_001"],
            estimated_subscribers=140,
            has_redundancy=True,
            topology_nodes=[],
            calculated_risk="LOW",
        )

        self.assertEqual(result["ai_status"], "FALLBACK")
        self.assertEqual(len(result["attempts"]), 2)
        self.assertTrue(all(a["status"] == "FAILED" for a in result["attempts"]))
        self.assertIn("Attempts:", result["fallback_reason"])
        self.assertTrue(result["engine_used"].startswith("Deterministic"))


if __name__ == "__main__":
    unittest.main()

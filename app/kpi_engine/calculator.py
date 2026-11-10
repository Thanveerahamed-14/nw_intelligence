"""
KPI Calculation Engine.
Calculates standardized 3GPP and transport KPIs across 15-minute windows
with full formula lineage, division-by-zero protection, and quality evaluation.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from app.kpi_engine.models import KPIRecord, DataQualityStatus

FORMULA_REGISTRY = {
    "CELL_AVAILABILITY": {
        "version": "v1.1",
        "unit": "%",
        "definition": "100 * (1 - (cell_downtime_seconds / interval_seconds))",
        "required_counters": ["cell_downtime_seconds"]
    },
    "RADIO_DROP_RATE": {
        "version": "v1.0",
        "unit": "%",
        "definition": "100 * (erab_abnormal_drops / (erab_abnormal_drops + erab_normal_releases))",
        "required_counters": ["erab_abnormal_drops", "erab_normal_releases"]
    },
    "PRB_UTILIZATION_DL": {
        "version": "v1.0",
        "unit": "%",
        "definition": "100 * (prb_used_dl / prb_available_dl)",
        "required_counters": ["prb_used_dl", "prb_available_dl"]
    },
    "TRANSPORT_PACKET_LOSS": {
        "version": "v1.2",
        "unit": "%",
        "definition": "100 * (packet_discards_out / (packets_total + packet_discards_out))",
        "required_counters": ["packet_discards_out"]
    },
    "RRC_SETUP_SUCCESS_RATE": {
        "version": "v1.0",
        "unit": "%",
        "definition": "100 * (rrc_connection_successes / rrc_connection_attempts)",
        "required_counters": ["rrc_connection_successes", "rrc_connection_attempts"]
    }
}

class KPICalculator:
    @staticmethod
    def calculate_window_kpis(
        entity_id: str,
        tenant_id: str,
        window_start: datetime,
        aggregated_counters: Dict[str, float],
        sample_count: int,
        expected_samples: int = 3,  # e.g., three 5-min intervals in a 15-min window
        interval_seconds: int = 900
    ) -> List[KPIRecord]:
        """Calculates all applicable KPIs for an entity in a 15-minute window."""
        results: List[KPIRecord] = []
        now = datetime.now(timezone.utc)
        
        # Calculate completeness score
        completeness = min(1.0, max(0.0, sample_count / float(expected_samples))) if expected_samples > 0 else 0.0
        
        if sample_count == 0:
            status = DataQualityStatus.NO_DATA
        elif completeness >= 1.0:
            status = DataQualityStatus.COMPLETE
        elif completeness >= 0.8:
            status = DataQualityStatus.PARTIAL_ESTIMATED
        else:
            status = DataQualityStatus.INCOMPLETE

        is_uncertain = (status in [DataQualityStatus.INCOMPLETE, DataQualityStatus.NO_DATA])
        uncertainty_msg = None
        if is_uncertain:
            uncertainty_msg = f"Only {sample_count}/{expected_samples} expected counter samples arrived before window close."

        # 1. Cell Availability
        if "cell_downtime_seconds" in aggregated_counters:
            downtime = aggregated_counters["cell_downtime_seconds"]
            avail = max(0.0, min(100.0, 100.0 * (1.0 - (downtime / interval_seconds))))
            results.append(KPIRecord(
                entity_id=entity_id,
                tenant_id=tenant_id,
                timestamp=window_start,
                interval_minutes=interval_seconds // 60,
                kpi_name="CELL_AVAILABILITY",
                value=round(avail, 2),
                unit="%",
                quality_status=status,
                completeness_score=round(completeness, 2),
                sample_count=sample_count,
                expected_samples=expected_samples,
                is_uncertain=is_uncertain,
                uncertainty_reason=uncertainty_msg,
                formula_version=FORMULA_REGISTRY["CELL_AVAILABILITY"]["version"],
                formula_definition=FORMULA_REGISTRY["CELL_AVAILABILITY"]["definition"],
                calculated_at=now
            ))

        # 2. RRC Setup Success Rate
        att = aggregated_counters.get("rrc_connection_attempts", 0.0)
        succ = aggregated_counters.get("rrc_connection_successes", 0.0)
        if att > 0:
            rrc_rate = max(0.0, min(100.0, 100.0 * (succ / att)))
            results.append(KPIRecord(
                entity_id=entity_id,
                tenant_id=tenant_id,
                timestamp=window_start,
                interval_minutes=interval_seconds // 60,
                kpi_name="RRC_SETUP_SUCCESS_RATE",
                value=round(rrc_rate, 2),
                unit="%",
                quality_status=status,
                completeness_score=round(completeness, 2),
                sample_count=sample_count,
                expected_samples=expected_samples,
                is_uncertain=is_uncertain,
                uncertainty_reason=uncertainty_msg,
                formula_version=FORMULA_REGISTRY["RRC_SETUP_SUCCESS_RATE"]["version"],
                formula_definition=FORMULA_REGISTRY["RRC_SETUP_SUCCESS_RATE"]["definition"],
                calculated_at=now
            ))

        # 3. Transport Packet Loss Rate
        discards = aggregated_counters.get("packet_discards_out", 0.0)
        octets = aggregated_counters.get("octets_out", 0.0)
        if "packet_discards_out" in aggregated_counters:
            # Estimate packets from octets (avg packet 1000 bytes) + discards
            est_total_packets = (octets / 1000.0) + discards
            loss = (discards / est_total_packets * 100.0) if est_total_packets > 0 else 0.0
            results.append(KPIRecord(
                entity_id=entity_id,
                tenant_id=tenant_id,
                timestamp=window_start,
                interval_minutes=interval_seconds // 60,
                kpi_name="TRANSPORT_PACKET_LOSS",
                value=round(min(100.0, loss), 2),
                unit="%",
                quality_status=status,
                completeness_score=round(completeness, 2),
                sample_count=sample_count,
                expected_samples=expected_samples,
                is_uncertain=is_uncertain,
                uncertainty_reason=uncertainty_msg,
                formula_version=FORMULA_REGISTRY["TRANSPORT_PACKET_LOSS"]["version"],
                formula_definition=FORMULA_REGISTRY["TRANSPORT_PACKET_LOSS"]["definition"],
                calculated_at=now
            ))

        # 4. PRB Utilization DL
        prb_used = aggregated_counters.get("prb_used_dl", 0.0)
        prb_avail = aggregated_counters.get("prb_available_dl", 0.0)
        if prb_avail > 0:
            prb_util = (prb_used / prb_avail) * 100.0
            results.append(KPIRecord(
                entity_id=entity_id,
                tenant_id=tenant_id,
                timestamp=window_start,
                interval_minutes=interval_seconds // 60,
                kpi_name="PRB_UTILIZATION_DL",
                value=round(min(100.0, prb_util), 2),
                unit="%",
                quality_status=status,
                completeness_score=round(completeness, 2),
                sample_count=sample_count,
                expected_samples=expected_samples,
                is_uncertain=is_uncertain,
                uncertainty_reason=uncertainty_msg,
                formula_version=FORMULA_REGISTRY["PRB_UTILIZATION_DL"]["version"],
                formula_definition=FORMULA_REGISTRY["PRB_UTILIZATION_DL"]["definition"],
                calculated_at=now
            ))

        return results

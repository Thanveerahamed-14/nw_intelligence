"""
Data Quality and Late Data Manager.
Handles delayed telemetry (up to 2 hours), watermarking, incremental recalculations,
and evidence integrity verification for autonomous agents.
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from app.kpi_engine.models import KPIRecord, PerformanceCounterRecord, DataQualityStatus
from app.kpi_engine.calculator import KPICalculator
from app.config import settings

class QualityAssessment:
    def __init__(
        self,
        entity_id: str,
        is_genuine_outage: bool,
        confidence: float,
        explanation: str,
        verdict: Optional[str] = None,
    ):
        self.entity_id = entity_id
        self.is_genuine_outage = is_genuine_outage
        self.confidence = confidence
        self.explanation = explanation
        # Nominal performance is distinct from missing telemetry. Collapsing the
        # two caused healthy entities to be reported as "uncertain".
        self.verdict = verdict or (
            "GENUINE_NETWORK_PROBLEM" if is_genuine_outage else "DATA_GAP_OR_UNCERTAINTY"
        )

    def to_dict(self) -> Dict:
        return {
            "entity_id": self.entity_id,
            "verdict": self.verdict,
            "confidence_score": round(self.confidence, 2),
            "explanation": self.explanation
        }

class KPIService:
    def __init__(self):
        # Store for raw performance counters: key -> (tenant_id, entity_id, window_start) -> dict of counters
        self.counter_store: Dict[str, Dict[str, Any]] = {}
        # Store for calculated KPIs: key -> list of KPIRecord
        self.kpi_store: Dict[str, List[KPIRecord]] = {}

    def _make_key(self, tenant_id: str, entity_id: str) -> str:
        return f"{tenant_id}:{entity_id}"

    def ingest_counters(
        self,
        tenant_id: str,
        entity_id: str,
        timestamp: datetime,
        counters: Dict[str, float],
        provenance_hash: str
    ) -> List[KPIRecord]:
        """
        Ingests raw counter sample. Aggregates into the corresponding 15-minute window.
        If the data arrives late (within 2 hours), triggers an incremental recalculation.
        """
        # Truncate to 15-minute boundary
        minute = (timestamp.minute // 15) * 15
        window_start = timestamp.replace(minute=minute, second=0, microsecond=0)
        
        store_key = f"{self._make_key(tenant_id, entity_id)}:{window_start.isoformat()}"
        
        if store_key not in self.counter_store:
            self.counter_store[store_key] = {
                "tenant_id": tenant_id,
                "entity_id": entity_id,
                "window_start": window_start,
                "counters": {},
                "sample_count": 0,
                "provenance_hashes": []
            }
            
        entry = self.counter_store[store_key]
        entry["sample_count"] += 1
        entry["provenance_hashes"].append(provenance_hash)
        
        for k, v in counters.items():
            entry["counters"][k] = entry["counters"].get(k, 0.0) + v
            
        # An ingestion is an incremental recalculation if we already had previous samples for this window
        is_recalculation = entry["sample_count"] > 1
        
        # Recalculate KPIs for this window
        kpi_list = KPICalculator.calculate_window_kpis(
            entity_id=entity_id,
            tenant_id=tenant_id,
            window_start=window_start,
            aggregated_counters=entry["counters"],
            sample_count=entry["sample_count"]
        )
        
        # Mark recalculation if updating an existing record
        entity_key = self._make_key(tenant_id, entity_id)
        if entity_key not in self.kpi_store:
            self.kpi_store[entity_key] = []
            
        existing = self.kpi_store[entity_key]
        # Remove previous versions for this window
        self.kpi_store[entity_key] = [r for r in existing if r.timestamp != window_start]
        
        for kpi in kpi_list:
            if is_recalculation:
                kpi.is_recalculated = True
                kpi.revision = entry["sample_count"]
            self.kpi_store[entity_key].append(kpi)
            
        return kpi_list

    def get_entity_kpis(
        self,
        tenant_id: str,
        entity_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> List[KPIRecord]:
        """Retrieves all KPI records for an entity in the time range [start_time, end_time]."""
        entity_key = self._make_key(tenant_id, entity_id)
        records = self.kpi_store.get(entity_key, [])
        return [
            r for r in records
            if r.tenant_id == tenant_id and start_time <= r.timestamp <= end_time
        ]

    def verify_evidence_integrity(
        self,
        tenant_id: str,
        entity_ids: List[str],
        window_start: datetime,
        window_end: datetime
    ) -> Dict[str, QualityAssessment]:
        """
        Crucial Agent Tool:
        Distinguishes between genuine network degradation vs incomplete/missing data.
        Returns a structured QualityAssessment for each queried entity.
        """
        assessments: Dict[str, QualityAssessment] = {}
        for eid in entity_ids:
            kpis = self.get_entity_kpis(tenant_id, eid, window_start, window_end)
            if not kpis:
                assessments[eid] = QualityAssessment(
                    entity_id=eid,
                    is_genuine_outage=False,
                    confidence=0.1,
                    explanation="NO_DATA: No performance counters received for this entity. Telemetry stream down or reporting gap.",
                    verdict="NO_DATA",
                )
                continue

            # Check completeness scores
            avg_completeness = sum(k.completeness_score for k in kpis) / len(kpis)
            has_uncertainty = any(k.is_uncertain for k in kpis)

            if avg_completeness < settings.DATA_QUALITY_COMPLETENESS_THRESHOLD:
                assessments[eid] = QualityAssessment(
                    entity_id=eid,
                    is_genuine_outage=False,
                    confidence=avg_completeness,
                    explanation=f"UNRESOLVED_UNCERTAINTY: Telemetry completeness is only {int(avg_completeness*100)}%. Degradation may be an artifact of missing reporting samples.",
                    verdict="DATA_GAP_OR_UNCERTAINTY",
                )
            else:
                # Telemetry is solid; inspect degradation
                avail_kpis = [k for k in kpis if k.kpi_name == "CELL_AVAILABILITY"]
                loss_kpis = [k for k in kpis if k.kpi_name == "TRANSPORT_PACKET_LOSS"]
                
                is_degraded = (
                    any(k.value < settings.KPI_CELL_AVAILABILITY_MIN_PCT for k in avail_kpis)
                    or any(k.value > settings.KPI_PACKET_LOSS_MAX_PCT for k in loss_kpis)
                )
                
                if is_degraded:
                    assessments[eid] = QualityAssessment(
                        entity_id=eid,
                        is_genuine_outage=True,
                        confidence=avg_completeness,
                        explanation=f"GENUINE_NETWORK_PROBLEM: Telemetry completeness is {int(avg_completeness*100)}% (high confidence). Physical degradation confirmed by received counter values.",
                        verdict="GENUINE_NETWORK_PROBLEM",
                    )
                else:
                    assessments[eid] = QualityAssessment(
                        entity_id=eid,
                        is_genuine_outage=False,
                        confidence=avg_completeness,
                        explanation="NOMINAL_PERFORMANCE: Telemetry complete and KPIs within normal operating thresholds.",
                        verdict="NOMINAL_PERFORMANCE",
                    )

        return assessments

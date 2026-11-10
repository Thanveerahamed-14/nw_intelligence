"""
KPI Engine Data Models.
Incorporates data quality classification, sample completeness scoring,
and formula lineage to distinguish true outages from missing telemetry.
"""

from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class DataQualityStatus(str, Enum):
    COMPLETE = "COMPLETE"              # 100% expected counters and sub-intervals present
    PARTIAL_ESTIMATED = "PARTIAL"      # Sufficient data to compute (>80%), but minor samples missing
    INCOMPLETE = "INCOMPLETE"          # Insufficient telemetry (<80%); high uncertainty
    NO_DATA = "NO_DATA"                # Telemetry completely missing / reporting node silent

class KPIRecord(BaseModel):
    entity_id: str
    tenant_id: str
    timestamp: datetime                # Start of 15-minute interval
    interval_minutes: int = 15
    kpi_name: str
    value: float
    unit: str
    
    # Evidence & Quality Metadata
    quality_status: DataQualityStatus
    completeness_score: float = Field(ge=0.0, le=1.0)
    sample_count: int
    expected_samples: int
    is_uncertain: bool = False
    uncertainty_reason: Optional[str] = None
    
    # Formula & Ingestion Lineage
    formula_version: str = "v1.0"
    formula_definition: str
    calculated_at: datetime
    is_recalculated: bool = False
    revision: int = 1

class PerformanceCounterRecord(BaseModel):
    entity_id: str
    tenant_id: str
    timestamp: datetime
    counters: Dict[str, float]
    provenance_hash: str
    ingested_at: datetime

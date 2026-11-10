"""
Data Provenance and Lineage Tracking.
Every record ingested preserves its origin, content hash, ingestion timestamp,
and transformation audit trail.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

class ProvenanceMetadata(BaseModel):
    source_vendor: str  # e.g., 'Ericsson_ENM', 'Nokia_NetAct', 'Cisco_EPN'
    source_system_id: str
    source_file_or_stream: str
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    raw_payload_hash: str
    pipeline_version: str = "v1.2.0"
    transformation_rules_applied: list[str] = Field(default_factory=list)

def compute_payload_hash(payload: Dict[str, Any]) -> str:
    """Computes a deterministic SHA-256 digest of raw payload dictionary."""
    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def create_provenance(
    source_vendor: str,
    source_system_id: str,
    source_file: str,
    raw_payload: Dict[str, Any],
    rules_applied: Optional[list[str]] = None
) -> ProvenanceMetadata:
    return ProvenanceMetadata(
        source_vendor=source_vendor,
        source_system_id=source_system_id,
        source_file_or_stream=source_file,
        raw_payload_hash=compute_payload_hash(raw_payload),
        transformation_rules_applied=rules_applied or ["canonical_mapping", "schema_validation"]
    )


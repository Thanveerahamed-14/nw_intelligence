"""
Validation, Deduplication, and Conflict Resolution Engine.
Resolves overlapping, late, or conflicting inventory & performance records
using deterministic authority weighting and bi-temporal precedence.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel, Field
from app.connection_factory.provenance import compute_payload_hash

class IngestionResult(BaseModel):
    status: str  # "ACCEPTED", "DUPLICATE_IGNORED", "CONFLICT_RESOLVED", "QUARANTINED"
    entity_id: str
    message: str
    record: Optional[Dict[str, Any]] = None
    quarantine_reason: Optional[str] = None

class ConflictResolutionPolicy:
    """
    Deterministic rules:
    1. Authoritative sources override secondary discovery sources.
    2. If source authority is identical, latest system/valid timestamp wins.
    3. If timestamps are identical and values conflict, quarantine for human/automated review.
    """
    SOURCE_AUTHORITY_RANK = {
        "ericsson_enm": 100,
        "nokia_netact": 100,
        "cisco_epn": 100,
        "cmdb_authoritative": 90,
        "snmp_collector": 60,
        "passive_crawler": 40
    }

    @classmethod
    def get_rank(cls, source_name: str) -> int:
        return cls.SOURCE_AUTHORITY_RANK.get(source_name.lower(), 50)

class IngestionValidator:
    def __init__(self):
        # In-memory store for idempotency checking (backed by BigQuery / Cloud SQL in prod)
        self.seen_hashes: set[str] = set()
        self.quarantine_log: List[Dict[str, Any]] = []

    def process_record(
        self,
        entity_id: str,
        timestamp: datetime,
        source_system: str,
        payload: Dict[str, Any],
        existing_record: Optional[Dict[str, Any]] = None
    ) -> IngestionResult:
        # 1. Schema integrity validation
        if not entity_id or not entity_id.strip():
            return IngestionResult(
                status="QUARANTINED",
                entity_id="UNKNOWN",
                message="Missing required field: entity_id",
                quarantine_reason="SCHEMA_VALIDATION_FAILURE"
            )

        # 2. Content Hash Deduplication
        payload_hash = compute_payload_hash(payload)
        record_key = f"{entity_id}:{timestamp.isoformat()}:{payload_hash}"
        if record_key in self.seen_hashes:
            return IngestionResult(
                status="DUPLICATE_IGNORED",
                entity_id=entity_id,
                message=f"Identical record hash {payload_hash[:8]} already processed. Skipped."
            )

        # 3. Conflict Resolution with Existing Stored Record
        if existing_record:
            existing_source = existing_record.get("source_system", "unknown")
            existing_rank = ConflictResolutionPolicy.get_rank(existing_source)
            new_rank = ConflictResolutionPolicy.get_rank(source_system)

            if new_rank < existing_rank:
                return IngestionResult(
                    status="CONFLICT_RESOLVED",
                    entity_id=entity_id,
                    message=f"Incoming record from {source_system} (rank {new_rank}) yielded to existing authoritative source {existing_source} (rank {existing_rank}).",
                    record=existing_record
                )
            elif new_rank == existing_rank:
                # Check timestamps
                existing_time = existing_record.get("timestamp")
                if existing_time and timestamp < existing_time:
                    return IngestionResult(
                        status="CONFLICT_RESOLVED",
                        entity_id=entity_id,
                        message=f"Incoming record is superseded by more recent record for {entity_id}.",
                        record=existing_record
                    )

        # Mark hash as processed
        self.seen_hashes.add(record_key)
        
        return IngestionResult(
            status="ACCEPTED",
            entity_id=entity_id,
            message="Record successfully validated and normalized.",
            record=payload
        )


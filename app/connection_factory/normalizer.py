"""
Multi-Vendor Normalizer.
Translates heterogeneous vendor models (Ericsson, Nokia, Cisco IP-RAN)
into unified 3GPP and platform-canonical entities and performance counters.
"""

from typing import Dict, Any, Tuple
from datetime import datetime, timezone
from app.connection_factory.provenance import create_provenance, ProvenanceMetadata

# Vendor Counter Dictionary Mapping -> Canonical 3GPP Names
VENDOR_COUNTER_MAP = {
    # Ericsson ENM / PM
    "ericsson": {
        "pmCellDowntimeAuto": "cell_downtime_seconds",
        "pmCellDowntimeMan": "cell_downtime_manual_seconds",
        "pmRrcConnEstabAtt": "rrc_connection_attempts",
        "pmRrcConnEstabSucc": "rrc_connection_successes",
        "pmRadioTxRank2": "dl_rank2_transmissions",
        "pmErabRelAbnormalEnb": "erab_abnormal_drops",
        "pmErabRelNormalEnb": "erab_normal_releases",
        "pmPrbUsedDl": "prb_used_dl",
        "pmPrbAvailDl": "prb_available_dl"
    },
    # Nokia NetAct
    "nokia": {
        "cell_unavailable_time": "cell_downtime_seconds",
        "rrc_conn_req": "rrc_connection_attempts",
        "rrc_conn_succ": "rrc_connection_successes",
        "erab_drop_nb": "erab_abnormal_drops",
        "erab_rel_succ": "erab_normal_releases",
        "dl_prb_used": "prb_used_dl",
        "dl_prb_avail": "prb_available_dl"
    },
    # Cisco IP-RAN / EPN-M Transport
    "cisco": {
        "ifInDiscards": "packet_discards_in",
        "ifOutDiscards": "packet_discards_out",
        "ifInErrors": "packet_errors_in",
        "ifOutErrors": "packet_errors_out",
        "ifHCInOctets": "octets_in",
        "ifHCOutOctets": "octets_out",
        "ifOperStatus": "interface_oper_status"
    }
}

class Normalizer:
    """Normalizes raw multi-vendor payloads into canonical records."""

    @staticmethod
    def normalize_entity_id(vendor: str, raw_id: str) -> str:
        """Converts vendor-specific Distinguished Names (DN) to canonical entity IDs."""
        v = vendor.lower()
        if "ericsson" in v:
            # e.g., SubNetwork=Core,ManagedElement=NODE_42,EUtranCellFDD=CELL_001 -> CELL_001
            parts = raw_id.split(",")
            return parts[-1].split("=")[-1]
        elif "nokia" in v:
            # e.g., MRBTS-42/LNBTS-42/LNCEL-1 -> LNCEL-1
            parts = raw_id.split("/")
            return parts[-1]
        return raw_id.strip()

    @staticmethod
    def normalize_performance_counters(
        vendor: str,
        entity_id: str,
        timestamp: datetime,
        raw_counters: Dict[str, Any],
        source_system: str,
        source_file: str
    ) -> Tuple[Dict[str, float], ProvenanceMetadata]:
        """
        Maps vendor raw performance counters to canonical counter dictionary
        and attaches provenance metadata.
        """
        vendor_key = "ericsson" if "ericsson" in vendor.lower() else "nokia" if "nokia" in vendor.lower() else "cisco"
        counter_map = VENDOR_COUNTER_MAP.get(vendor_key, {})
        
        canonical_counters: Dict[str, float] = {}
        rules_applied = []
        
        for raw_name, val in raw_counters.items():
            canonical_name = counter_map.get(raw_name, raw_name)
            try:
                canonical_counters[canonical_name] = float(val) if val is not None else 0.0
                if canonical_name != raw_name:
                    rules_applied.append(f"{raw_name}->{canonical_name}")
            except (ValueError, TypeError):
                canonical_counters[canonical_name] = 0.0
                rules_applied.append(f"{raw_name}:coerced_to_zero")
                
        provenance = create_provenance(
            source_vendor=vendor,
            source_system_id=source_system,
            source_file=source_file,
            raw_payload={"entity_id": entity_id, "timestamp": timestamp.isoformat(), "counters": raw_counters},
            rules_applied=rules_applied
        )
        
        return canonical_counters, provenance


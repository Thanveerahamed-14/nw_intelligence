"""
ChromaDB Vector Store Service with Zero-Download Offline Telecom Embeddings.
Guarantees 100% local, air-gapped execution without requiring external ONNX/HuggingFace downloads.
"""

import os
import math
import hashlib
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
from app.config import settings

# 128-dimensional deterministic domain embedding function for telecom runbooks
class OfflineTelecomEmbeddingFunction(EmbeddingFunction):
    def __init__(self, dim: int = 128):
        self.dim = dim

    def _embed_text(self, text: str) -> List[float]:
        tokens = text.lower().replace(",", " ").replace(".", " ").replace("(", " ").replace(")", " ").split()
        vec = [0.0] * self.dim
        for token in tokens:
            if not token:
                continue
            # Deterministic feature hashing
            idx = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16) % self.dim
            vec[idx] += 1.0

        # L2 Normalization
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def __call__(self, input: Documents) -> Embeddings:
        return [self._embed_text(doc) for doc in input]

# Pre-seeded telecom runbooks and historical incident RCAs
DEFAULT_TELECOM_RUNBOOKS = [
    {
        "id": "RCA-OPTICAL-001",
        "title": "Cisco ASR-903 Cell Site Router: Optical Fiber Backhaul Interface Degradation",
        "vendor": "Cisco / IP-RAN",
        "category": "TRANSPORT_FIBER",
        "document": (
            "Symptoms: High packet discards (>80%), interface error spikes, and sudden 0% availability "
            "across all collocated 4G/5G cells hosted at the site. Pre-incident KPIs nominal until sudden drop. "
            "Root Cause: SFP+ optical transceiver physical degradation or fiber micro-bend causing catastrophic loss. "
            "Standard Remediation: Divert backhaul traffic to Standby Microwave 80GHz protection link or secondary BGP peer. "
            "Rollback: Re-enable primary optical interface once light levels (Tx/Rx dBm) normalize."
        ),
        "metadata": {"severity": "CRITICAL", "layer": "TRANSPORT", "recommended_action": "REROUTE_STANDBY_MICROWAVE"}
    },
    {
        "id": "RCA-TELEMETRY-002",
        "title": "Missing Performance Counter Telemetry vs Genuine Radio Carrier Drop",
        "vendor": "3GPP / OSS Collector",
        "category": "DATA_INTEGRITY",
        "document": (
            "Symptoms: Single cell reports zero availability or missing samples in 15-minute window, "
            "while surrounding sectors on the same radio node report normal traffic and no hardware alarms. "
            "Root Cause: Telemetry reporting gap, SFTP mediation delay, or collector buffer overflow. "
            "Action Rule: If completeness score is below 80%, agents MUST decline destructive network changes. "
            "Remediation: Trigger collector resynchronization; open mediation pipeline audit ticket."
        ),
        "metadata": {"severity": "MEDIUM", "layer": "TELEMETRY", "recommended_action": "VERIFY_INGESTION_COLLECTOR"}
    },
    {
        "id": "RCA-BASEBAND-003",
        "title": "Ericsson Baseband 6630 CPRI Link Loss of Signal (LOS)",
        "vendor": "Ericsson",
        "category": "RADIO_ACCESS_NETWORK",
        "document": (
            "Symptoms: Multiple radio carriers offline simultaneously. Node reports CPRI Loss of Frame (LOF) or LOS to RRU. "
            "Root Cause: Optical transceiver failure on Baseband digital unit optical port. "
            "Remediation: Execute soft reset on optical CPRI port. If persistent, dispatch field technician for SFP replacement."
        ),
        "metadata": {"severity": "HIGH", "layer": "RAN", "recommended_action": "RESET_CPRI_PORT"}
    },
    {
        "id": "RCA-CORE-004",
        "title": "User Plane Function (UPF) / SGW-U GTP-U Tunnel Congestion",
        "vendor": "5G Core",
        "category": "CORE_NETWORK",
        "document": (
            "Symptoms: Radio links show 100% availability, but subscribers experience severe throughput throttling and high latency. "
            "Root Cause: N3 interface GTP tunnel buffer overflow on core UPF node. "
            "Remediation: Shift DNN slice traffic pool to secondary regional UPF instance."
        ),
        "metadata": {"severity": "HIGH", "layer": "CORE", "recommended_action": "FAILOVER_CORE_UPF"}
    }
]

class TelecomVectorStore:
    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or settings.CHROMA_PERSIST_DIRECTORY
        os.makedirs(self.persist_dir, exist_ok=True)
        
        self.embedding_fn = OfflineTelecomEmbeddingFunction(dim=128)
        
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=ChromaSettings(allow_reset=True, anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="telecom_incident_runbooks",
            embedding_function=self.embedding_fn,
            metadata={"description": "Telecom Incident Troubleshooting Runbooks and Historical RCAs"}
        )
        self._seed_default_runbooks()

    def _seed_default_runbooks(self):
        """Populates the vector store with initial domain runbooks if empty."""
        count = self.collection.count()
        if count == 0:
            ids = [r["id"] for r in DEFAULT_TELECOM_RUNBOOKS]
            docs = [f"{r['title']}\n{r['document']}" for r in DEFAULT_TELECOM_RUNBOOKS]
            metadatas = [r["metadata"] for r in DEFAULT_TELECOM_RUNBOOKS]
            self.collection.add(
                ids=ids,
                documents=docs,
                metadatas=metadatas
            )

    def search_runbooks(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Performs semantic vector similarity search against incident runbooks.
        Returns top matching runbooks with similarity distances and metadata.
        """
        results = self.collection.query(
            query_texts=[query],
            n_results=min(top_k, max(1, self.collection.count()))
        )
        
        formatted = []
        if results and results.get("ids") and len(results["ids"]) > 0:
            ids = results["ids"][0]
            docs = results["documents"][0] if results.get("documents") else []
            metadatas = results["metadatas"][0] if results.get("metadatas") else []
            distances = results["distances"][0] if results.get("distances") else []
            
            for idx, item_id in enumerate(ids):
                # Cosine distance to similarity score
                dist = distances[idx] if idx < len(distances) else 0.0
                sim = round(max(0.0, 1.0 - (dist / 2.0)), 3)
                formatted.append({
                    "id": item_id,
                    "document": docs[idx] if idx < len(docs) else "",
                    "metadata": metadatas[idx] if idx < len(metadatas) else {},
                    "similarity_score": sim
                })
        return formatted

    def add_runbook(self, runbook_id: str, title: str, text: str, metadata: Optional[Dict[str, Any]] = None):
        """Allows agents or engineers to index new resolution procedures."""
        doc = f"{title}\n{text}"
        self.collection.upsert(
            ids=[runbook_id],
            documents=[doc],
            metadatas=[metadata or {}]
        )

# Global singleton
_vector_store_instance: Optional[TelecomVectorStore] = None

def get_vector_store() -> TelecomVectorStore:
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = TelecomVectorStore()
    return _vector_store_instance

"""
Configuration settings for the Network Intelligence Platform.
Supports environment-based configuration for Google Cloud deployments (Cloud Run, BigQuery, Firestore, Vertex AI)
as well as local development mode.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional, Union
import os
import json

class Settings(BaseSettings):
    # Application & Environment
    APP_NAME: str = "Telecom Network Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"  # development, staging, production
    DEBUG: bool = False
    
    # API & Host
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Multi-tenancy
    ALLOWED_TENANTS: Union[List[str], str] = ["customer_a", "customer_b", "customer_c", "customer_d", "customer_e"]
    DEFAULT_TENANT: str = "customer_a"

    def get_allowed_tenants(self) -> List[str]:
        if isinstance(self.ALLOWED_TENANTS, str):
            clean = self.ALLOWED_TENANTS.strip()
            if clean.startswith("[") and clean.endswith("]"):
                try:
                    return json.loads(clean)
                except Exception:
                    pass
            return [t.strip() for t in clean.split(",") if t.strip()]
        return list(self.ALLOWED_TENANTS)
    
    # SLA & Performance Bounds
    TOPOLOGY_MAX_HOPS_DEFAULT: int = 2
    TOPOLOGY_MAX_HOPS_ABSOLUTE_LIMIT: int = 3
    TOPOLOGY_QUERY_TIMEOUT_SECONDS: float = 2.0  # p95 target < 2s
    AGENT_INVESTIGATION_TIMEOUT_SECONDS: float = 30.0  # 30s target for initial response
    MAX_TOPOLOGY_NODES_PER_RESPONSE: int = 250
    
    # KPI Engine Settings
    KPI_INTERVAL_MINUTES: int = 15
    LATE_DATA_WATERMARK_HOURS: int = 2.0  # Data accepted up to 2 hours late
    DATA_QUALITY_COMPLETENESS_THRESHOLD: float = 0.80  # Below 80% marks record as PARTIAL/INCOMPLETE
    
    # GCP Infrastructure Mapping (for Production)
    GCP_PROJECT_ID: str = "telecom-nw-intelligence-prod"
    GCP_REGION: str = "europe-west1"
    BIGQUERY_DATASET_COUNTERS: str = "telecom_counters"
    BIGQUERY_DATASET_KPIS: str = "telecom_kpis"
    FIRESTORE_COLLECTION_SESSIONS: str = "agent_sessions"
    PUBSUB_TOPIC_INVENTORY: str = "inventory-events"
    PUBSUB_TOPIC_COUNTERS: str = "performance-counters"
    PUBSUB_TOPIC_REMEDIATION: str = "remediation-actions"
    
    # LLM Settings (Google Gemini & Vertex AI)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    VERTEX_AI_MODEL: str = "gemini-1.5-flash"
    USE_MOCK_LLM_IF_NO_KEY: bool = True  # Allows deterministic fallback simulation if offline

    # Graph Database Settings (Neo4j & In-Memory Bi-Temporal Graph)
    NEO4J_URI: Optional[str] = None
    NEO4J_USER: Optional[str] = "neo4j"
    NEO4J_PASSWORD: Optional[str] = None
    NEO4J_DATABASE: str = "neo4j"

    # Vector Database Settings (ChromaDB for Runbook / RCA Embeddings)
    VECTOR_DB_TYPE: str = "chromadb"
    CHROMA_PERSIST_DIRECTORY: str = "./data/vector_store"

    # Relational Database Settings
    DATABASE_URL: str = "sqlite:///./data/network_intelligence.db"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()


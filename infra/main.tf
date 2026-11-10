# Google Cloud Platform Production Infrastructure (Terraform)
# Provisions Cloud Run, BigQuery, Cloud SQL, Memorystore Redis, Pub/Sub, and IAM for Role-Based Agents

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.15.0"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "telecom-nw-intelligence-prod"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# -------------------------------------------------------------
# 1. Cloud Pub/Sub: Ingestion Streaming
# -------------------------------------------------------------
resource "google_pubsub_topic" "raw_telemetry" {
  name = "raw-telemetry-bursts"
  message_retention_duration = "86400s" # 24 hours
}

resource "google_pubsub_topic" "inventory_events" {
  name = "inventory-events"
}

# -------------------------------------------------------------
# 2. Google BigQuery: 50M Performance Counters / Day
# -------------------------------------------------------------
resource "google_bigquery_dataset" "telecom_counters" {
  dataset_id                  = "telecom_counters"
  friendly_name               = "Raw Performance Counters Data Lake"
  description                 = "Partitioned by DATE(timestamp) and clustered by tenant_id & entity_id"
  location                    = var.region
  default_table_expiration_ms = 7776000000 # 90 days retention
}

resource "google_bigquery_dataset" "telecom_kpis" {
  dataset_id    = "telecom_kpis"
  friendly_name = "Aggregated 15-Minute 3GPP KPIs"
  location      = var.region
}

# -------------------------------------------------------------
# 3. Memorystore (Redis): 2-Hop Graph Adjacency Cache (< 2s SLA)
# -------------------------------------------------------------
resource "google_redis_instance" "topology_cache" {
  name           = "topology-adjacency-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = 2
  region         = var.region
  redis_version  = "REDIS_7_0"
  display_name   = "Low-latency Sub-graph Cache for AI Agents"
}

# -------------------------------------------------------------
# 4. Cloud SQL (PostgreSQL): Bi-Temporal Entity Metadata
# -------------------------------------------------------------
resource "google_sql_database_instance" "temporal_db" {
  name             = "telecom-topology-metadata"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-2-7680"
    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }
    ip_configuration {
      ipv4_enabled = false
      require_ssl  = true
    }
  }
}

# -------------------------------------------------------------
# 5. Cloud Run: FastAPI + Model Context Protocol (MCP) Server
# -------------------------------------------------------------
resource "google_cloud_run_v2_service" "platform_service" {
  name     = "network-intelligence-platform"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0 # Scale to zero for cost optimization
      max_instance_count = 100 # Scalable to handle 100 concurrent agent investigations
    }
    containers {
      image = "gcr.io/${var.project_id}/network-intelligence-platform:latest"
      resources {
        limits = {
          cpu    = "2000m"
          memory = "2Gi"
        }
      }
      env {
        name  = "ENVIRONMENT"
        value = "production"
      }
      env {
        name  = "ALLOWED_TENANTS"
        value = "customer_a,customer_b,customer_c,customer_d,customer_e"
      }
    }
  }
}

# -------------------------------------------------------------
# 6. IAM Service Accounts for Role-Based Autonomous Agents
# -------------------------------------------------------------
resource "google_service_account" "alarm_agent_sa" {
  account_id   = "alarm-management-agent"
  display_name = "Alarm Management Autonomous Agent Service Account"
}

resource "google_service_account" "perf_agent_sa" {
  account_id   = "perf-analysis-agent"
  display_name = "Performance Analysis Agent Service Account"
}

resource "google_service_account" "change_agent_sa" {
  account_id   = "change-planning-agent"
  display_name = "Change Planning Agent Service Account"
}

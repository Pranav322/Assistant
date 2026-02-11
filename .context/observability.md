# OBSERVABILITY SPECIFICATION
**Version:** 1.0.1
**Aligned with:** schema.sql v2.2, security.md v3.0, retrieval.md v1.0, deployment.md v1.0.1
**Last Updated:** 2026-02-12

---

## **📋 OVERVIEW**

Comprehensive observability strategy using open-source standards (Prometheus, OpenTelemetry, Grafana) to ensure reliability, performance, and business insights.

### **Monitoring Pillars:**
1. **Metrics:** Real-time numerical data (Prometheus)
2. **Logs:** Structured events (structlog → Loki/CloudWatch)
3. **Traces:** Distributed request tracing (OpenTelemetry → Jaeger/Tempo)
4. **Health:** Synthetics and uptime checks
5. **Business Intelligence:** Usage and cost tracking

---

## **🎯 SERVICE LEVEL OBJECTIVES (SLOs)**

### **Core SLOs:**
| Service | SLO Target | Error Budget | Measurement Method |
|---------|------------|--------------|-------------------|
| **API Availability** | 99.9% | 43m/month | Uptime checks every 1m |
| **P95 Latency (Chat)** | < 2000ms | 5% of requests | Prometheus histogram |
| **P95 Latency (Search)** | < 500ms | 5% of requests | Prometheus histogram |
| **Ingestion Success** | 99.5% | 0.5% failures | Background job status |
| **Widget Load Time** | < 500ms | 10% slow loads | RUM metrics |

### **RPO/RTO Targets:**
- **Recovery Point Objective (RPO):** 1 hour (max data loss)
- **Recovery Time Objective (RTO):** 4 hours (max downtime)

---

## **📊 METRICS STRATEGY (Prometheus)**

### **Standard Labels:**
All metrics must include:
- `env`: production/staging
- `service`: api/worker
- `version`: git_sha
- `project_id`: (where applicable)

### **1. API Metrics:**
| Metric Name | Type | Description |
|-------------|------|-------------|
| `http_requests_total` | Counter | Total requests by method, path, status |
| `http_request_duration_seconds` | Histogram | Latency distribution (buckets: 0.1, 0.5, 1, 2, 5, 10) |
| `http_requests_in_flight` | Gauge | Current active requests |
| `auth_failures_total` | Counter | Failed auth attempts by reason |
| `rate_limit_hits_total` | Counter | Throttled requests |

### **2. Database Metrics (PostgreSQL):**
| Metric Name | Type | Description |
|-------------|------|-------------|
| `pg_stat_activity_count` | Gauge | Active connections |
| `pg_stat_database_tup_fetched` | Counter | Rows read |
| `pg_stat_database_tup_inserted` | Counter | Rows written |
| `pg_stat_database_deadlocks` | Counter | Deadlocks detected |
| `pg_vector_index_size_bytes` | Gauge | Size of HNSW indexes |

### **3. Business Metrics:**
| Metric Name | Type | Description |
|-------------|------|-------------|
| `projects_active_total` | Gauge | Total active projects |
| `sources_ingested_total` | Counter | Total documents processed |
| `chunks_total` | Gauge | Total vectors stored |
| `messages_sent_total` | Counter | Total chat messages |
| `tokens_consumed_total` | Counter | LLM tokens used (input/output) |
| `revenue_estimated_usd` | Gauge | Real-time cost estimation |

### **4. AI/ML Metrics:**
| Metric Name | Type | Description |
|-------------|------|-------------|
| `llm_request_duration_seconds` | Histogram | Latency of LLM calls |
| `llm_token_count` | Histogram | Token usage distribution |
| `embedding_generation_seconds` | Histogram | Latency of embedding API |
| `retrieval_precision_at_k` | Gauge | Relevance score (offline eval) |
| `cache_hit_ratio` | Gauge | Embedding/Response cache effectiveness |

---

## **📝 LOGGING STRATEGY**

### **Format:**
JSON structured logging using `structlog` (Python).

### **Standard Fields:**
```json
{
  "timestamp": "2026-02-12T10:30:00Z",
  "level": "info",
  "service": "api",
  "request_id": "req_abc123",
  "project_id": "proj_xyz789",
  "user_id": "user_456",
  "module": "chat_service",
  "message": "Chat response generated",
  "duration_ms": 1245,
  "tokens": 342,
  "model": "gpt-4o-mini"
}
```

### **Usage Guide:**

**Do:**
- Log context (IDs, status)
- Log actionable events
- Log structured data, not strings
- Log stack traces only on ERROR

**Don't:**
- ❌ Log PII (emails, names, phone numbers)
- ❌ Log verify tokens or secrets
- ❌ Log message content (privacy)
- ❌ Log health check success (spam)

### **Implementation (Python):**
```python
import structlog

logger = structlog.get_logger()

# Good
logger.info("ingestion_started", 
    source_id=source.id, 
    file_type=source.type,
    size_bytes=file.size
)

# Bad
logger.info(f"Started ingesting {source.id}")
```

---

## **🕵️ DISTRIBUTED TRACING (OpenTelemetry)**

### **Trace Sampling:**
- **Production:** 1% of read requests, 100% of write/error requests
- **Staging:** 100% of all requests

### **Key Spans:**
1. **HTTP Request:** Full duration
   - `http.method`
   - `http.route`
   - `http.status_code`

2. **Database Query:** SQL execution
   - `db.system`: postgresql
   - `db.statement`: SELECT...

3. **LLM Call:** External API call
   - `llm.provider`: openai
   - `llm.model`: gpt-4o-mini
   - `llm.tokens`: 120

4. **Vector Search:**
   - `vector.collection`: chunks
   - `vector.k`: 10
   - `vector.latency`: 45ms

### **Instrumentation:**
```python
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

# Auto-instrumentation
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument(engine=engine)
RedisInstrumentor().instrument()

# Manual spans
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("generate_embeddings"):
    span = trace.get_current_span()
    span.set_attribute("batch_size", len(texts))
    # ... code ...
```

---

## **🚨 ALERTING RULES**

### **Severity Levels:**
1. **P1 (Critical):** Wake up call (PageDuty). System down, data loss, >5% error rate.
2. **P2 (Warning):** Slack notification. Degraded performance, high latency, capacity warning.
3. **P3 (Info):** Dashboard only. Deployment success, daily reports.

### **Alert Definitions:**

| Alert Name | Severity | Condition | Action |
|------------|----------|-----------|--------|
| `API_Down` | P1 | `up{job="api"} == 0` for 1m | Restart service, check logs |
| `High_Error_Rate` | P1 | `rate(5xx[5m]) > 5%` | Check release, db connection |
| `DB_Connection_Spike` | P2 | `pg_connections > 90%` | Scale pgbouncer, check leaks |
| `Worker_Queue_Backlog` | P2 | `queue_depth > 1000` for 10m | Scale workers |
| `High_Latency_Chat` | P2 | `P95_latency > 5s` for 5m | Check LLM provider status |
| `Disk_Space_Low` | P2 | `disk_free < 10%` | Clean logs, expand volume |
| `Rate_Limit_Abuse` | P3 | `rate_limit_hits > 1000/m` | Investigate IP |

---

## **📊 GRAFANA DASHBOARDS**

### **1. Executive / Business Dashboard:**
- Current active users (Real-time)
- Total revenue today (Est.)
- Total questions answered
- Average cost per query
- Usage by plan (Free vs Pro)

### **2. API Performance Dashboard:**
- Request rate (RPS)
- Latency (P50, P95, P99)
- Error rate (%)
- Endpoint breakdown
- Active connections

### **3. RAG Pipeline Dashboard:**
- Ingestion queue depth
- Embedding generation latency
- Vector search latency
- Reranking latency
- Cache hit rates (Embedding/Response)
- Token usage per provider

### **4. Database Health Dashboard:**
- CPU/Memory usage
- IOPS
- Connection pool status
- Cache hit ratio
- Vacuum status
- Deadlocks

---

## **🚦 HEALTH CHECKS**

### **Liveness Probe (Is it running?):**
`GET /health`
- Returns 200 OK if process is up.
- Fast, no dependencies checked.

### **Readiness Probe (Can it serve traffic?):**
`GET /health/ready`
- Checks DB connection
- Checks Redis connection
- Checks S3 access
- Returns 200 OK only if all healthy.

### **Synthetic Monitoring:**
Runs every 5 minutes from external location:
1. Login (get token)
2. Create project
3. Upload small text
4. Query chat
5. Verify response
6. Delete project

---

## **📱 REAL USER MONITORING (RUM)**

### **Widget Telemetry:**
The widget reports client-side metrics to `POST /metrics/widget` (batched):

```json
{
  "metrics": [
    {
      "name": "widget_load_time",
      "value": 450,
      "tags": { "browser": "chrome", "os": "mac" }
    },
    {
      "name": "first_contentful_paint",
      "value": 800,
      "tags": { "page": "/pricing" }
    }
  ]
}
```

### **Browser Constraints:**
- Use `navigator.sendBeacon` for reliability
- Batch metrics to minimize requests
- Sample 10% of sessions to reduce noise

---

## **🛠️ TOOLING STACK**

| Component | Tool (Self-Hosted) | Managed Alternative |
|-----------|--------------------|---------------------|
| **Metrics** | Prometheus | Grafana Cloud / AWS Managed Prometheus |
| **Visuals** | Grafana | Grafana Cloud |
| **Logs** | Loki + Promtail | Datadog / CloudWatch Logs |
| **Tracing** | Jaeger | Honeycomb / AWS X-Ray |
| **Alerts** | Alertmanager | PagerDuty / OpsGenie |
| **Synthetics** | Blackbox Exporter | Checkly / Pingdom |

---

## **✅ SETUP CHECKLIST**

### **Day 1:**
- [ ] Configure structured logging (JSON)
- [ ] Expose `/metrics` endpoint in API
- [ ] Set up Prometheus scraping
- [ ] Import Grafana dashboards

### **Day 2:**
- [ ] Add OpenTelemetry instrumentation
- [ ] Configure Jaeger/Tempo
- [ ] Set up basic alerts (Uptime, Errors)

### **Day 3:**
- [ ] Implement business metrics
- [ ] Set up SLO tracking
- [ ] Create synthetic tests
- [ ] Document runbooks for alerts

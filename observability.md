# OBSERVABILITY SPECIFICATION
**Version:** 1.0.1
**Aligned with:** schema.sql v2.2, security.md v3.0, retrieval.md v1.0, deployment.md v1.0.1
**Last Updated:** 2026-02-12

---

## **📊 OVERVIEW**

Observability is implemented across three pillars: **Metrics** (Prometheus), **Logs** (structured JSON), and **Traces** (OpenTelemetry). Loki/Jaeger are optional backends for logs/traces.

### **Architecture:**
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ FastAPI │ │ Workers │ │ Widget │
│ Service │────│ (Dramatiq)│────│ (Browser) │
└─────────────┘ └─────────────┘ └─────────────┘
│ │ │
▼ ▼ ▼
┌────────────────────────────────────────────────────┐
│ OpenTelemetry Instrumentation │
└────────────────────────────────────────────────────┘
│ │ │
▼ ▼ ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Prometheus │ │ Loki │ │ Jaeger │
│ (Metrics) │ │ (Logs) │ │ (Traces) │
└─────────────┘ └─────────────┘ └─────────────┘
│ │ │
└──────────────────┼──────────────────┘
▼
┌─────────────┐
│ Grafana │
│ (Dashboards)│
└─────────────┘

text

---

## **🎯 SERVICE LEVEL OBJECTIVES (SLOs)**

### **Core SLOs:**
| Service | SLO Target | Error Budget | Measurement Method |
|---------|------------|--------------|-------------------|
| **API Availability** | 99.9% | 43m/month | Uptime checks every 1m |
| **Retrieval Latency** | P95 < 500ms | 5% | Prometheus histogram |
| **Ingestion Success** | 99% | 1% | Background job success rate |
| **Widget Load Time** | < 2s P95 | 5% | Real User Monitoring |
| **LLM Response Time** | < 5s P95 | 5% | End-to-end tracing |

### **Business SLOs:**
| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **User Satisfaction** | > 4/5 stars | Product quality |
| **Answer Relevance** | > 80% | Retrieval effectiveness |
| **Support Tickets** | < 1/100 users | User experience |
| **Revenue Growth** | 10% MoM | Business health |

### **Error Budget Policy:**
```yaml
error_budgets:
  api_availability:
    monthly_budget: 43 minutes
    burn_rate_thresholds:
      fast_burn: 2.0  # 2x faster than budget
      slow_burn: 0.1  # 10% of budget used
    actions:
      fast_burn: "Immediate investigation, stop deploys"
      slow_burn: "Weekly review, proceed with caution"
      
  retrieval_latency:
    monthly_budget: 36 hours > 500ms
    alert_when: "Budget burned by 50% in 1 day"
📈 METRICS COLLECTION
Prometheus Metrics Schema:
1. HTTP Metrics (FastAPI):

python
from prometheus_fastapi_instrumentator import Instrumentator

# Auto-instrument FastAPI
Instrumentator().instrument(app).expose(app)

# Custom metrics
REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint', 'status']
)

TOKENS_USED = Counter(
    'llm_tokens_total',
    'Total tokens used',
    ['project_id', 'model', 'type']  # type: prompt/completion
)
2. Database Metrics:

python
# PostgreSQL metrics via pg_stat_statements
POSTGRES_METRICS = [
    'pg_stat_database_numbackends',
    'pg_stat_database_xact_commit',
    'pg_stat_database_xact_rollback',
    'pg_stat_user_tables_n_tup_ins',
    'pg_stat_user_tables_n_tup_upd',
    'pg_stat_user_tables_n_tup_del',
]

# Vector search performance
VECTOR_SEARCH_DURATION = Histogram(
    'vector_search_duration_seconds',
    'Vector search query duration',
    ['project_id', 'result_count']
)
3. Business Metrics:

python
# User engagement
ACTIVE_PROJECTS = Gauge(
    'projects_active_total',
    'Number of active projects'
)

QUERIES_PER_PROJECT = Counter(
    'project_queries_total',
    'Total queries per project',
    ['project_id']
)

REVENUE_GENERATED = Counter(
    'revenue_usd_total',
    'Total revenue in USD'
)
4. AI/ML Quality Metrics:

python
# Retrieval quality
RETRIEVAL_PRECISION = Histogram(
    'retrieval_precision_at_k',
    'Precision@k for retrieval',
    ['project_id', 'k']  # k=1,3,5,10
)

HALLUCINATION_RATE = Gauge(
    'hallucination_rate',
    'Percentage of answers with hallucinations',
    ['project_id']
)

USER_FEEDBACK = Counter(
    'user_feedback_total',
    'User feedback counts',
    ['project_id', 'sentiment']  # positive, negative
)
Metrics Export Configuration:
yaml
# prometheus.yml
scrape_configs:
  - job_name: 'chatbot-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    
  # Optional exporters (add services in deployment.md if you use them)
  # - job_name: 'chatbot-workers'
  #   static_configs:
  #     - targets: ['worker:9191']
  #   scrape_interval: 30s
  #
  # - job_name: 'postgres'
  #   static_configs:
  #     - targets: ['postgres-exporter:9187']
  #
  # - job_name: 'redis'
  #   static_configs:
  #     - targets: ['redis-exporter:9121']
  #
  # - job_name: 'node'
  #   static_configs:
  #     - targets: ['node-exporter:9100']
📝 STRUCTURED LOGGING
Logging Configuration:
python
import structlog
import logging
import sys

# Configure structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

# Get logger
logger = structlog.get_logger()

# Usage with context
logger = logger.bind(
    service="chatbot-api",
    environment=os.getenv("ENVIRONMENT", "development"),
    version="1.0.0"
)
Log Categories:
1. Security Logs:

python
async def log_security_event(event_type: str, **kwargs):
    logger.warning(
        "security_event",
        event_type=event_type,
        **kwargs,
        # Auto-redacted fields
        _redact=["api_key", "password", "token"]
    )
2. Performance Logs:

python
@contextmanager
def log_performance(operation: str, **context):
    start = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        logger.info(
            "performance",
            operation=operation,
            duration_ms=round(duration * 1000, 2),
            **context
        )
3. Business Logs:

python
def log_conversation(project_id: str, message: dict, response: dict):
    logger.info(
        "conversation",
        project_id=project_id,
        user_message=message['content'][:200],  # Truncate
        response_time_ms=response.get('metadata', {}).get('response_time_ms'),
        tokens_used=response.get('usage', {}).get('total_tokens'),
        # Never log full messages in production
        _sensitive=["user_message", "response_text"]
    )
Log Retention Policy:
yaml
logging:
  retention:
    # Loki retention
    production:
      stream:
        period: 24h    # Keep in hot storage
        period_units: hours
      chunk:
        period: 168h   # Keep in warm storage (7 days)
        period_units: hours
      index:
        period: 720h   # Keep index (30 days)
        period_units: hours
        
  storage:
    hot:  # SSD storage
      size: 50GB
    warm:  # HDD storage  
      size: 200GB
      
  backup:
    s3_bucket: "chatbot-logs-backup"
    retention_days: 365
🔍 DISTRIBUTED TRACING
OpenTelemetry Configuration:
python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor

# Setup tracing
trace.set_tracer_provider(TracerProvider())

# Jaeger exporter
jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger",
    agent_port=6831,
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Instrument everything
FastAPIInstrumentor.instrument_app(app)
RedisInstrumentor().instrument()
Psycopg2Instrumentor().instrument()

# Get tracer
tracer = trace.get_tracer(__name__)
Trace Spans for Key Operations:
1. Chat Request Flow:

python
async def handle_chat_request(request: Request, query: str):
    with tracer.start_as_current_span("chat_request") as span:
        span.set_attributes({
            "project_id": request.state.project_id,
            "query_length": len(query),
            "conversation_id": request.state.conversation_id
        })
        
        # Sub-spans for each component
        with tracer.start_as_current_span("query_processing"):
            processed_query = await process_query(query)
            
        with tracer.start_as_current_span("retrieval"):
            chunks = await retrieve_chunks(processed_query)
            span.set_attribute("chunks_retrieved", len(chunks))
            
        with tracer.start_as_current_span("llm_generation"):
            response = await generate_response(chunks, query)
            span.set_attribute("tokens_used", response.usage.total_tokens)
            
        return response
2. Ingestion Pipeline:

python
async def ingest_source(source: Source):
    with tracer.start_as_current_span("ingest_source") as span:
        span.set_attributes({
            "source_id": str(source.id),
            "source_type": source.type,
            "project_id": str(source.project_id)
        })
        
        # Trace each step
        steps = ["download", "parse", "chunk", "embed", "store"]
        for step in steps:
            with tracer.start_as_current_span(f"ingest_{step}"):
                await perform_step(step, source)
                
        span.set_status(StatusCode.OK)
Trace Sampling Strategy:
python
# Sample rates based on importance
SAMPLING_RATES = {
    "production": {
        "high_importance": 1.0,    # 100% - Security events, errors
        "medium_importance": 0.1,   # 10% - Regular requests
        "low_importance": 0.01,     # 1% - Health checks, monitoring
    },
    "development": {
        "all": 1.0  # Sample everything in dev
    }
}

# Configure sampler
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

def dynamic_sampler(parent_context, trace_id, name, kind, attributes, links):
    # Sample based on endpoint
    if attributes.get("http.route") in ["/health", "/metrics"]:
        return Decision.DROP  # Don't sample health checks
        
    if attributes.get("http.status_code", 200) >= 500:
        return Decision.RECORD_AND_SAMPLE  # Always sample errors
        
    # Default sampling rate
    return TraceIdRatioBased(0.1)
🚨 ALERTING & NOTIFICATIONS
Alert Rules (Prometheus):
yaml
# alert_rules.yml
groups:
  - name: chatbot_critical
    rules:
      - alert: APIHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          service: api
        annotations:
          summary: "High error rate ({{ $value }} errors/second)"
          description: "API error rate above 5% for 5 minutes"
          runbook: "https://chatbot.com/runbooks/api-errors"
          
      - alert: DatabaseHighConnections
        expr: pg_stat_database_numbackends{database="chatbot"} > 150
        for: 2m
        labels:
          severity: warning
          service: database
        annotations:
          summary: "High database connections ({{ $value }})"
          
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        labels:
          severity: warning
          service: redis
  
  - name: chatbot_business
    rules:
      - alert: HighTokenUsage
        expr: rate(llm_tokens_total[1h]) > 1000000
        for: 15m
        labels:
          severity: warning
          service: billing
        annotations:
          summary: "High token usage detected"
          description: "Project {{ $labels.project_id }} using {{ $value }} tokens/hour"
          
      - alert: UserFeedbackNegative
        expr: rate(user_feedback_total{sentiment="negative"}[1h]) / rate(user_feedback_total[1h]) > 0.3
        for: 1h
        labels:
          severity: warning
          service: quality
Alert Manager Configuration:
yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@chatbot.com'
  smtp_auth_username: 'alerts@chatbot.com'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
    - match:
        severity: critical
      receiver: critical-alerts
      continue: false
      
    - match:
        severity: warning
      receiver: warning-alerts

receivers:
  - name: critical-alerts
    email_configs:
      - to: 'oncall@chatbot.com'
        headers:
          Subject: '[CRITICAL] Chatbot Alert: {{ .GroupLabels.alertname }}'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-critical'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
        
  - name: warning-alerts
    email_configs:
      - to: 'engineering@chatbot.com'
        headers:
          Subject: '[WARNING] Chatbot Alert: {{ .GroupLabels.alertname }}'
    slack_configs:
      - channel: '#alerts-warning'
Escalation Policy:
yaml
escalation_policy:
  level_1:
    duration: 15 minutes
    notify: ["engineering@chatbot.com", "slack:#alerts"]
    
  level_2:
    duration: 30 minutes
    notify: ["oncall@chatbot.com", "sms:+15551234567"]
    
  level_3:
    duration: 60 minutes
    notify: ["cto@chatbot.com", "sms:+15559876543"]
    
  level_4:
    duration: 120 minutes
    notify: ["ceo@chatbot.com", "all-hands meeting"]
📊 GRAFANA DASHBOARDS
Dashboard Requirements:
1. Executive Dashboard:

Active projects

Monthly recurring revenue (MRR)

User growth

Customer satisfaction (CSAT)

Top queries

2. Engineering Dashboard:

System health (CPU, memory, disk)

API performance (latency, error rate)

Database metrics (connections, queries)

Queue depths (background jobs)

Cache hit rates

3. AI/ML Dashboard:

Retrieval quality (precision@k, recall@k)

LLM performance (latency, token usage)

Embedding cache effectiveness

Hallucination rate

User feedback trends

4. Business Dashboard:

Revenue

Customer acquisition cost (CAC)

Lifetime value (LTV)

Churn rate

Support ticket volume

Dashboard Configuration:
json
{
  "dashboard": {
    "title": "Chatbot Platform - Engineering",
    "tags": ["chatbot", "engineering", "production"],
    "timezone": "browser",
    "panels": [
      {
        "title": "API Request Rate",
        "type": "graph",
        "targets": [{
          "expr": "rate(http_requests_total[5m])",
          "legendFormat": "{{method}} {{handler}}"
        }]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [{
          "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
          "format": "percent"
        }],
        "thresholds": "65,80"
      }
    ],
    "refresh": "30s"
  }
}
Real User Monitoring (RUM):
javascript
// Widget RUM implementation
class WidgetMetrics {
  constructor() {
    this.metrics = {
      performance: {},
      errors: [],
      userActions: []
    };
    
    this.initPerformanceMonitoring();
    this.initErrorTracking();
    this.initUserActionTracking();
  }
  
  initPerformanceMonitoring() {
    // Navigation timing
    const timing = performance.timing;
    this.metrics.performance = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      ttfb: timing.responseStart - timing.requestStart
    };
    
    // Send to backend
    this.sendMetrics('performance', this.metrics.performance);
  }
  
  sendMetrics(type, data) {
    // RUM ingest endpoint is optional and not defined in api_spec.md.
    // Send via beacon API (doesn't block page unload)
    // Implement a dedicated metrics ingest endpoint if needed.
    navigator.sendBeacon('https://metrics.chatbot.com/rum', JSON.stringify({
      type: type,
      data: data,
      session_id: this.sessionId,
      timestamp: Date.now()
    }));
  }
}
🔧 MONITORING AS CODE
Terraform Configuration:
hcl
# monitoring.tf
resource "grafana_dashboard" "engineering" {
  config_json = file("${path.module}/dashboards/engineering.json")
  folder = var.environment
}

resource "grafana_dashboard" "business" {
  config_json = file("${path.module}/dashboards/business.json")
  folder = var.environment
}

resource "grafana_alert_notification" "slack" {
  name = "slack-alerts"
  type = "slack"
  settings = jsonencode({
    url = var.slack_webhook_url
  })
}

resource "prometheus_rule" "chatbot_rules" {
  name = "chatbot-alerts"
  group = "chatbot"
  rule {
    alert = "APIHighErrorRate"
    expr = "rate(http_requests_total{status=~\"5..\"}[5m]) > 0.05"
    for = "5m"
    labels = {
      severity = "critical"
    }
    annotations = {
      summary = "High error rate detected"
    }
  }
}
Kubernetes Monitoring (Future):
yaml
# k8s/monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: chatbot-api
spec:
  selector:
    matchLabels:
      app: chatbot-api
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
    
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: chatbot-rules
spec:
  groups:
  - name: chatbot
    rules:
    - alert: PodRestartFrequently
      expr: kube_pod_container_status_restarts_total{pod=~"chatbot-api-.*"} > 5
      for: 5m
📋 HEALTH CHECKS
Synthetic Monitoring:
python
# health_checks.py
class HealthChecks:
    async def check_api(self):
        """Check API endpoints are responding"""
        checks = {
            "api_health": await self.check_endpoint("/health"),
            # Optional: add authenticated /v1/projects/{project_id}/chat probe
        }
        return all(checks.values())
    
    async def check_database(self):
        """Check database connectivity and performance"""
        try:
            # Simple query
            result = await db.fetch_one("SELECT 1")
            
            # Check replication lag if applicable
            lag = await db.fetch_val("SELECT pg_current_wal_lsn()")
            
            return True
        except Exception as e:
            logger.error("database_health_check_failed", error=str(e))
            return False
    
    async def check_storage(self):
        """Check object storage accessibility"""
        try:
            # Test write/read/delete
            test_key = f"healthcheck/{uuid.uuid4()}"
            await storage.write(test_key, b"test")
            data = await storage.read(test_key)
            await storage.delete(test_key)
            
            return data == b"test"
        except Exception as e:
            logger.error("storage_health_check_failed", error=str(e))
            return False
External Monitoring (UptimeRobot):
yaml
uptime_checks:
  - name: "API Health"
    url: "https://api.chatbot.com/health"
    interval: 60
    expected_status: 200
    alert_contacts: ["Primary", "Secondary"]
    
  - name: "Widget Load"
    url: "https://widget.chatbot.com/health"
    interval: 60
    expected_content: '"status":"healthy"'
    
  - name: "Chat End-to-End"
    url: "https://api.chatbot.com/v1/chat"
    method: POST
    body: '{"query":"test"}'
    headers:
      Authorization: "Bearer test_token"

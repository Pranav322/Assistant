# Observability Setup

This project exposes `/metrics` and `/health/ready` and ships structured JSON logs.
Use this guide when setting up monitoring and alerting.

## Metrics (Prometheus)

Prometheus should scrape the API service at `/metrics`.

Example scrape config:

```yaml
scrape_configs:
  - job_name: "rag-api"
    metrics_path: /metrics
    scrape_interval: 15s
    static_configs:
      - targets: ["api:8000"]
```

## Quickstart (Prometheus + Grafana)

Use the provided compose file to bring up a minimal observability stack:

```bash
docker compose -f docker-compose.observability.yml up -d
```

Then open:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin)

Note: The default config scrapes `chatbot-api:8000`. If your API container name
differs, update `observability/prometheus.yml`.

Required labels are already included in the app:
- `env`
- `service`
- `version`
- `project_id` (when available)

## Tracing (OpenTelemetry)

Tracing is enabled by default. Configure the OTEL exporter in your environment.

Recommended env vars:
- `OTEL_ENABLED=true`
- `OTEL_SAMPLE_RATE=0.01`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317`
- `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`

If you do not have an OTEL collector yet, set `OTEL_ENABLED=false`.

## Logging (structlog JSON)

Logs are JSON formatted. Use your preferred log shipper (Loki, CloudWatch, Datadog).
Do not log PII, secrets, or message content.

## Health Checks

- Liveness: `GET /health`
- Readiness: `GET /health/ready`

Readiness checks DB, Redis, and S3 access.

## Suggested Dashboards

Use these metrics to build dashboards:
- `http_requests_total`
- `http_request_duration_seconds`
- `http_requests_in_flight`
- `auth_failures_total`
- `rate_limit_hits_total`

## Alerts (Starter)

- High error rate: `rate(http_requests_total{status=~"5.."}[5m]) > 0.05`
- High latency: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2`
- API down: `up{job="rag-api"} == 0`

## Notes

- If you add new metrics, update this file.
- When production domains are finalized, update CSP/origin settings accordingly.

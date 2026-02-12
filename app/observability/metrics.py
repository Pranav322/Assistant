from __future__ import annotations

from typing import Optional
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from fastapi import Response
from app.core.config import settings

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["env", "service", "version", "method", "path", "status", "project_id"],
)
REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["env", "service", "version", "method", "path", "project_id"],
    buckets=(0.1, 0.5, 1, 2, 5, 10),
)
REQUESTS_IN_FLIGHT = Gauge(
    "http_requests_in_flight",
    "Current in-flight requests",
    ["env", "service", "version"],
)
AUTH_FAILURES = Counter(
    "auth_failures_total",
    "Authentication failures",
    ["env", "service", "version", "reason"],
)
RATE_LIMIT_HITS = Counter(
    "rate_limit_hits_total",
    "Rate limit hits",
    ["env", "service", "version", "endpoint"],
)


def _base_labels() -> dict[str, str]:
    return {
        "env": settings.ENVIRONMENT,
        "service": settings.SERVICE_NAME,
        "version": settings.GIT_SHA,
    }


def observe_request(
    method: str,
    path: str,
    status_code: int,
    duration_seconds: float,
    project_id: Optional[str],
) -> None:
    labels = _base_labels()
    project_label = project_id or "unknown"
    REQUEST_COUNT.labels(
        **labels,
        method=method,
        path=path,
        status=str(status_code),
        project_id=project_label,
    ).inc()
    REQUEST_DURATION.labels(
        **labels,
        method=method,
        path=path,
        project_id=project_label,
    ).observe(duration_seconds)


def record_auth_failure(reason: str) -> None:
    AUTH_FAILURES.labels(**_base_labels(), reason=reason).inc()


def record_rate_limit_hit(endpoint: str) -> None:
    RATE_LIMIT_HITS.labels(**_base_labels(), endpoint=endpoint).inc()


def track_in_flight(delta: int) -> None:
    labels = _base_labels()
    if delta > 0:
        REQUESTS_IN_FLIGHT.labels(**labels).inc(delta)
    else:
        REQUESTS_IN_FLIGHT.labels(**labels).dec(abs(delta))


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

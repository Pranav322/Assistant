from __future__ import annotations

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from app.core.config import settings
from app.api.deps import engine


def configure_tracing(app) -> None:
    if not settings.OTEL_ENABLED:
        return

    resource = Resource.create(
        {
            "service.name": settings.SERVICE_NAME,
            "service.version": settings.GIT_SHA,
            "deployment.environment": settings.ENVIRONMENT,
        }
    )
    provider = TracerProvider(
        resource=resource, sampler=TraceIdRatioBased(settings.OTEL_SAMPLE_RATE)
    )
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
    RedisInstrumentor().instrument()

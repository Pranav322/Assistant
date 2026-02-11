from fastapi import FastAPI
from fastapi import status, Request
from fastapi.responses import JSONResponse
import time
import uuid
import structlog
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.observability.metrics import observe_request, track_in_flight, metrics_response
from app.observability.logging import configure_logging
from app.observability.tracing import configure_tracing
from app.observability.health import readiness

from app.api.v1.api_router import api_router

configure_logging()
logger = structlog.get_logger()


def _apply_security_headers(response) -> None:
    response.headers.setdefault(
        "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
    )
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
    )


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
)

configure_tracing(app)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    track_in_flight(1)
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        _apply_security_headers(response)
        return response
    except Exception:
        logger.exception("request_failed", request_id=request_id)
        raise
    finally:
        duration = time.perf_counter() - start
        track_in_flight(-1)
        route = request.scope.get("route")
        path = route.path if route and hasattr(route, "path") else request.url.path
        project_id = getattr(request.state, "project_id", None)
        observe_request(
            method=request.method,
            path=path,
            status_code=status_code,
            duration_seconds=duration,
            project_id=str(project_id) if project_id else None,
        )
        if path not in {"/health", "/health/ready", "/metrics"}:
            logger.info(
                "request_completed",
                request_id=request_id,
                project_id=str(project_id) if project_id else None,
                method=request.method,
                path=path,
                status_code=status_code,
                duration_ms=int(duration * 1000),
                service=settings.SERVICE_NAME,
            )


@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.get("/health/ready")
async def readiness_check():
    checks = await readiness()
    if all(checks.values()):
        return {"status": "ready", "checks": checks}
    return JSONResponse(
        content={"status": "not_ready", "checks": checks},
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


@app.get("/metrics")
def metrics():
    return metrics_response()


@app.get("/")
def root():
    return {"message": "Welcome to Universal RAG Platform API"}

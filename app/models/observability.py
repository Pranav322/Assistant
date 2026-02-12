import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class RetrievalMetric(Base):
    __tablename__ = "retrieval_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True
    )
    query_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    query_length: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retrieval_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chunks_considered: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chunks_returned: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reranker_used: Mapped[bool] = mapped_column(Boolean, default=False)

    vector_search_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    keyword_search_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    fusion_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rerank_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    cache_hit_rate: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    avg_vector_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    avg_keyword_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    avg_reranker_score: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    action: Mapped[str] = mapped_column(String, nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    detail: Mapped[dict] = mapped_column(JSONB, default=dict)

    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class WidgetMetric(Base):
    __tablename__ = "widget_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    tags: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

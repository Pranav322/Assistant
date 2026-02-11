from sqlalchemy import (
    DateTime,
    Integer,
    Text,
    func,
    String,
    BigInteger,
    UniqueConstraint,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
import uuid
from typing import Optional
from .base import Base


class CacheEntry(Base):
    __tablename__ = "cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    cache_key: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cache_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    data: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    hits: Mapped[int] = mapped_column(Integer, default=0)
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id", "cache_key", "cache_type", name="uq_cache_project_key_type"
        ),
        CheckConstraint("cache_type IN ('embedding','response')", name="ck_cache_type"),
    )


class RateLimit(Base):
    __tablename__ = "rate_limits"

    api_key_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("api_keys.id", ondelete="CASCADE"),
        primary_key=True,
    )
    window_type: Mapped[str] = mapped_column(String, primary_key=True)
    window_bucket: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True
    )

    request_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_count: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)


class IngestionDeadLetter(Base):
    __tablename__ = "ingestion_dead_letter"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    failed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

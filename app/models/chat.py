import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    session_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0)

    token_usage: Mapped[dict] = mapped_column(JSONB, default=dict)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_conv_project", "project_id"),
        Index("idx_conv_session", "project_id", "session_id"),
    )

    # Relationships
    # project = relationship("Project", back_populates="conversations") # Uncomment if needed in Project
    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(String, nullable=True)  # user, assistant, system
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('user','assistant','system')", name="ck_messages_role"
        ),
        Index("idx_messages_conv", "conversation_id"),
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

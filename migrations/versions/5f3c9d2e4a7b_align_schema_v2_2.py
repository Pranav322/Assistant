"""Align schema with v2.2

Revision ID: 5f3c9d2e4a7b
Revises: bc39d3364e91
Create Date: 2026-02-11 22:35:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "5f3c9d2e4a7b"
down_revision: Union[str, Sequence[str], None] = "bc39d3364e91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gin")

    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_conversation()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE conversations
            SET
                last_message_at = NEW.created_at,
                message_count = message_count + 1
            WHERE id = NEW.conversation_id;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION reset_daily_token_usage()
        RETURNS void AS $$
        BEGIN
            UPDATE projects
            SET usage = jsonb_set(
                usage,
                '{tokens_today}',
                '0'::jsonb
            )
            WHERE (usage->>'tokens_today')::int > 0;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
        RETURNS void AS $$
        BEGIN
            DELETE FROM browser_tokens
            WHERE expires_at < now() - INTERVAL '1 hour';
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION purge_deleted_projects()
        RETURNS void AS $$
        BEGIN
            DELETE FROM projects
            WHERE deleted_at IS NOT NULL
              AND deleted_at < now() - INTERVAL '30 days';
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION purge_old_audit_logs()
        RETURNS void AS $$
        BEGIN
            DELETE FROM audit_logs
            WHERE created_at < now() - INTERVAL '1 year';
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute("UPDATE users SET email_verified = false WHERE email_verified IS NULL")
    op.execute("ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()")
    op.execute("ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false")

    op.execute(
        "UPDATE projects SET allowed_origins = '{}' WHERE allowed_origins IS NULL"
    )
    op.execute("UPDATE projects SET settings = '{}'::jsonb WHERE settings IS NULL")
    op.execute("UPDATE projects SET usage = '{}'::jsonb WHERE usage IS NULL")
    op.execute("UPDATE projects SET plan = 'free' WHERE plan IS NULL")
    op.execute("UPDATE projects SET is_active = true WHERE is_active IS NULL")
    op.execute("ALTER TABLE projects ALTER COLUMN id SET DEFAULT gen_random_uuid()")
    op.execute(
        "ALTER TABLE projects ALTER COLUMN allowed_origins SET DEFAULT '{}'::text[]"
    )
    op.execute("ALTER TABLE projects ALTER COLUMN plan SET DEFAULT 'free'")
    op.execute("ALTER TABLE projects ALTER COLUMN settings SET DEFAULT '{}'::jsonb")
    op.execute("ALTER TABLE projects ALTER COLUMN usage SET DEFAULT '{}'::jsonb")
    op.execute("ALTER TABLE projects ALTER COLUMN is_active SET DEFAULT true")

    op.execute("UPDATE api_keys SET scopes = '{ingest,query}' WHERE scopes IS NULL")
    op.execute(
        "UPDATE api_keys SET allowed_origins = '{}' WHERE allowed_origins IS NULL"
    )
    op.execute("UPDATE api_keys SET rate_limit = '{}'::jsonb WHERE rate_limit IS NULL")
    op.execute(
        "UPDATE api_keys SET usage_limit = '{}'::jsonb WHERE usage_limit IS NULL"
    )
    op.execute("ALTER TABLE api_keys ALTER COLUMN id SET DEFAULT gen_random_uuid()")
    op.execute("ALTER TABLE api_keys ALTER COLUMN scopes SET DEFAULT '{ingest,query}'")
    op.execute(
        "ALTER TABLE api_keys ALTER COLUMN allowed_origins SET DEFAULT '{}'::text[]"
    )
    op.execute("ALTER TABLE api_keys ALTER COLUMN rate_limit SET DEFAULT '{}'::jsonb")
    op.execute("ALTER TABLE api_keys ALTER COLUMN usage_limit SET DEFAULT '{}'::jsonb")

    op.execute(
        "ALTER TABLE browser_tokens ALTER COLUMN token_id SET DEFAULT gen_random_uuid()"
    )

    op.execute("UPDATE sources SET metadata = '{}'::jsonb WHERE metadata IS NULL")
    op.execute("UPDATE sources SET status = 'pending' WHERE status IS NULL")
    op.execute("ALTER TABLE sources ALTER COLUMN id SET DEFAULT gen_random_uuid()")
    op.execute("ALTER TABLE sources ALTER COLUMN metadata SET DEFAULT '{}'::jsonb")
    op.execute("ALTER TABLE sources ALTER COLUMN status SET DEFAULT 'pending'")

    op.execute("UPDATE chunks SET metadata = '{}'::jsonb WHERE metadata IS NULL")
    op.execute("ALTER TABLE chunks ALTER COLUMN id SET DEFAULT gen_random_uuid()")
    op.execute("ALTER TABLE chunks ALTER COLUMN metadata SET DEFAULT '{}'::jsonb")

    op.execute(
        "ALTER TABLE embeddings ALTER COLUMN model_name SET DEFAULT 'text-embedding-3-small'"
    )
    op.execute("ALTER TABLE embeddings ALTER COLUMN model_version SET DEFAULT '1.0'")

    op.execute("UPDATE conversations SET message_count = 0 WHERE message_count IS NULL")
    op.execute(
        "UPDATE conversations SET token_usage = '{}'::jsonb WHERE token_usage IS NULL"
    )
    op.execute(
        "ALTER TABLE conversations ALTER COLUMN id SET DEFAULT gen_random_uuid()"
    )
    op.execute("ALTER TABLE conversations ALTER COLUMN message_count SET DEFAULT 0")
    op.execute(
        "ALTER TABLE conversations ALTER COLUMN token_usage SET DEFAULT '{}'::jsonb"
    )

    op.execute("UPDATE messages SET metadata = '{}'::jsonb WHERE metadata IS NULL")
    op.execute("ALTER TABLE messages ALTER COLUMN id SET DEFAULT gen_random_uuid()")
    op.execute("ALTER TABLE messages ALTER COLUMN metadata SET DEFAULT '{}'::jsonb")

    op.execute(
        "UPDATE retrieval_metrics SET reranker_used = false WHERE reranker_used IS NULL"
    )
    op.execute(
        "ALTER TABLE retrieval_metrics ALTER COLUMN id SET DEFAULT gen_random_uuid()"
    )
    op.execute(
        "ALTER TABLE retrieval_metrics ALTER COLUMN reranker_used SET DEFAULT false"
    )

    op.execute("ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()")

    op.add_column(
        "chunks",
        sa.Column(
            "search_tsvector",
            postgresql.TSVECTOR(),
            sa.Computed(
                "to_tsvector('english', coalesce(metadata->>'section_title','') || ' ' || text)",
                persisted=True,
            ),
        ),
    )

    op.create_unique_constraint(
        "uq_sources_project_content_hash", "sources", ["project_id", "content_hash"]
    )

    op.execute(
        "UPDATE sources SET type = 'text' WHERE type IS NULL "
        "OR type NOT IN ('pdf','url','text','markdown')"
    )
    op.create_check_constraint(
        "ck_sources_type", "sources", "type IN ('pdf','url','text','markdown')"
    )
    op.create_check_constraint(
        "ck_sources_status",
        "sources",
        "status IN ('pending','processing','completed','failed')",
    )
    op.create_check_constraint(
        "ck_messages_role", "messages", "role IN ('user','assistant','system')"
    )

    op.create_table(
        "cache",
        sa.Column(
            "id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("cache_key", sa.Text(), nullable=True),
        sa.Column("cache_type", sa.Text(), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("hits", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_accessed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "cache_key", "cache_type", name="uq_cache_project_key_type"
        ),
        sa.CheckConstraint(
            "cache_type IN ('embedding','response')", name="ck_cache_type"
        ),
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION cleanup_expired_cache()
        RETURNS void AS $$
        BEGIN
            DELETE FROM cache
            WHERE expires_at < now();
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.create_table(
        "rate_limits",
        sa.Column("api_key_id", sa.UUID(), nullable=False),
        sa.Column("window_type", sa.Text(), nullable=False),
        sa.Column("window_bucket", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=True),
        sa.Column("token_count", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["api_key_id"], ["api_keys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("api_key_id", "window_type", "window_bucket"),
    )

    op.create_table(
        "ingestion_dead_letter",
        sa.Column(
            "id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("source_id", sa.UUID(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "attempts", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "failed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("idx_projects_owner", "projects", ["owner_id"])
    op.execute(
        "CREATE INDEX idx_projects_active ON projects(is_active) WHERE is_active = true"
    )

    op.create_index("idx_api_keys_project", "api_keys", ["project_id"])
    op.execute(
        "CREATE INDEX idx_api_keys_active ON api_keys(project_id) WHERE revoked_at IS NULL"
    )

    op.create_index("idx_browser_tokens_expiry", "browser_tokens", ["expires_at"])
    op.create_index("idx_browser_tokens_project", "browser_tokens", ["project_id"])
    op.create_index("idx_browser_tokens_hash", "browser_tokens", ["token_hash"])
    op.execute(
        "CREATE INDEX idx_browser_tokens_revoked ON browser_tokens(revoked_at) "
        "WHERE revoked_at IS NOT NULL"
    )

    op.create_index("idx_sources_project", "sources", ["project_id"])
    op.create_index("idx_sources_status", "sources", ["project_id", "status"])

    op.execute(
        "CREATE INDEX idx_chunks_project_tsv ON chunks USING GIN(project_id, search_tsvector)"
    )
    op.create_index("idx_chunks_project", "chunks", ["project_id"])
    op.create_index("idx_chunks_source", "chunks", ["source_id"])

    op.create_index("idx_embeddings_project", "embeddings", ["project_id"])
    op.execute(
        "CREATE INDEX idx_embeddings_hnsw ON embeddings USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_index("idx_conv_project", "conversations", ["project_id"])
    op.create_index("idx_conv_session", "conversations", ["project_id", "session_id"])

    op.create_index("idx_messages_conv", "messages", ["conversation_id"])

    op.create_index("idx_cache_expiry", "cache", ["expires_at"])
    op.create_index(
        "idx_cache_lookup", "cache", ["project_id", "cache_key", "cache_type"]
    )

    op.create_index(
        "idx_retrieval_metrics_project_time",
        "retrieval_metrics",
        ["project_id", "created_at"],
    )
    op.create_index(
        "idx_retrieval_metrics_performance", "retrieval_metrics", ["retrieval_time_ms"]
    )

    op.create_index("idx_audit_project", "audit_logs", ["project_id"])
    op.create_index("idx_audit_action", "audit_logs", ["project_id", "action"])
    op.create_index("idx_audit_created", "audit_logs", ["created_at"])

    op.execute(
        "CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users "
        "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
    )
    op.execute(
        "CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects "
        "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
    )
    op.execute(
        "CREATE TRIGGER trg_api_keys_updated_at BEFORE UPDATE ON api_keys "
        "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
    )
    op.execute(
        "CREATE TRIGGER trg_sources_updated_at BEFORE UPDATE ON sources "
        "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
    )
    op.execute(
        "CREATE TRIGGER trg_update_conversation AFTER INSERT ON messages "
        "FOR EACH ROW EXECUTE FUNCTION update_conversation()"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_update_conversation ON messages")
    op.execute("DROP TRIGGER IF EXISTS trg_sources_updated_at ON sources")
    op.execute("DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys")
    op.execute("DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects")
    op.execute("DROP TRIGGER IF EXISTS trg_users_updated_at ON users")

    op.execute("DROP INDEX IF EXISTS idx_audit_created")
    op.execute("DROP INDEX IF EXISTS idx_audit_action")
    op.execute("DROP INDEX IF EXISTS idx_audit_project")
    op.execute("DROP INDEX IF EXISTS idx_retrieval_metrics_performance")
    op.execute("DROP INDEX IF EXISTS idx_retrieval_metrics_project_time")
    op.execute("DROP INDEX IF EXISTS idx_cache_lookup")
    op.execute("DROP INDEX IF EXISTS idx_cache_expiry")
    op.execute("DROP INDEX IF EXISTS idx_messages_conv")
    op.execute("DROP INDEX IF EXISTS idx_conv_session")
    op.execute("DROP INDEX IF EXISTS idx_conv_project")
    op.execute("DROP INDEX IF EXISTS idx_embeddings_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_embeddings_project")
    op.execute("DROP INDEX IF EXISTS idx_chunks_source")
    op.execute("DROP INDEX IF EXISTS idx_chunks_project")
    op.execute("DROP INDEX IF EXISTS idx_chunks_project_tsv")
    op.execute("DROP INDEX IF EXISTS idx_sources_status")
    op.execute("DROP INDEX IF EXISTS idx_sources_project")
    op.execute("DROP INDEX IF EXISTS idx_browser_tokens_revoked")
    op.execute("DROP INDEX IF EXISTS idx_browser_tokens_hash")
    op.execute("DROP INDEX IF EXISTS idx_browser_tokens_project")
    op.execute("DROP INDEX IF EXISTS idx_browser_tokens_expiry")
    op.execute("DROP INDEX IF EXISTS idx_api_keys_active")
    op.execute("DROP INDEX IF EXISTS idx_api_keys_project")
    op.execute("DROP INDEX IF EXISTS idx_projects_active")
    op.execute("DROP INDEX IF EXISTS idx_projects_owner")

    op.drop_table("ingestion_dead_letter")
    op.drop_table("rate_limits")
    op.drop_table("cache")

    op.drop_constraint("ck_messages_role", "messages", type_="check")
    op.drop_constraint("ck_sources_status", "sources", type_="check")
    op.drop_constraint("ck_sources_type", "sources", type_="check")
    op.drop_constraint("uq_sources_project_content_hash", "sources", type_="unique")

    op.drop_column("chunks", "search_tsvector")

    op.execute("DROP FUNCTION IF EXISTS purge_old_audit_logs")
    op.execute("DROP FUNCTION IF EXISTS purge_deleted_projects")
    op.execute("DROP FUNCTION IF EXISTS cleanup_expired_cache")
    op.execute("DROP FUNCTION IF EXISTS cleanup_expired_tokens")
    op.execute("DROP FUNCTION IF EXISTS reset_daily_token_usage")
    op.execute("DROP FUNCTION IF EXISTS update_conversation")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column")

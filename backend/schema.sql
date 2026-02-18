-- =========================================================
-- UNIVERSAL RAG PLATFORM — LOCKED PRODUCTION SCHEMA
-- PostgreSQL + pgvector
-- Version: 2.3 (Aligned with security.md v3.0)
-- Updated: 2026-02-12
-- =========================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- UTILITY: Auto-update updated_at trigger function
-- =========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    email_verified BOOLEAN DEFAULT false,
    plan TEXT DEFAULT 'free',
    plan_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- USER USAGE (LIFETIME COUNTERS)
-- =========================================================

CREATE TABLE user_usage (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tokens_used BIGINT DEFAULT 0,
    requests_used BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_user_usage_updated_at
BEFORE UPDATE ON user_usage
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- PROJECTS
-- =========================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,

    -- Widget embedding: allowed origins for CSP + origin validation
    allowed_origins TEXT[] DEFAULT '{}',
    plan TEXT DEFAULT 'free',  -- 'free', 'pro', 'business', 'enterprise'

    settings JSONB DEFAULT '{}'::jsonb,
    usage JSONB DEFAULT '{}'::jsonb,

    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,  -- soft delete support (GDPR/CCPA)

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_active ON projects(is_active) WHERE is_active = true;

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- API KEYS (bcrypt hashed — NEVER SHA-256)
-- =========================================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    name TEXT,                              -- human-readable key name
    key_hash TEXT NOT NULL,                 -- bcrypt hash only

    scopes TEXT[] DEFAULT '{ingest,query}', -- permission scopes
    allowed_origins TEXT[] DEFAULT '{}',    -- per-key origin restriction

    rate_limit JSONB DEFAULT '{}'::jsonb,
    usage_limit JSONB DEFAULT '{}'::jsonb,

    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_active ON api_keys(project_id)
    WHERE revoked_at IS NULL;

CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- BROWSER TOKENS (JWT tracking for widget auth)
-- =========================================================

CREATE TABLE browser_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,

    token_hash TEXT,               -- SHA-256 of JWT (for revocation lookups)
    origin TEXT,                   -- the origin this token was issued for

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_browser_tokens_expiry ON browser_tokens(expires_at);
CREATE INDEX idx_browser_tokens_project ON browser_tokens(project_id);
CREATE INDEX idx_browser_tokens_hash ON browser_tokens(token_hash);
CREATE INDEX idx_browser_tokens_revoked ON browser_tokens(revoked_at)
    WHERE revoked_at IS NOT NULL;

-- =========================================================
-- SOURCES
-- =========================================================

CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    type TEXT CHECK (type IN ('pdf','url','text','markdown')),
    content_hash TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    progress JSONB DEFAULT '{}'::jsonb,

    storage_location TEXT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','processing','completed','failed')),

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(project_id, content_hash)
);

CREATE INDEX idx_sources_project ON sources(project_id);
CREATE INDEX idx_sources_status ON sources(project_id, status);

CREATE TRIGGER trg_sources_updated_at
BEFORE UPDATE ON sources
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- CHUNKS
-- =========================================================

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE,

    text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,

    search_tsvector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(metadata->>'section_title','') || ' ' || text)
    ) STORED,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Keyword + tenant optimized index
CREATE INDEX idx_chunks_project_tsv
ON chunks USING GIN(project_id, search_tsvector);

CREATE INDEX idx_chunks_project
ON chunks(project_id);

CREATE INDEX idx_chunks_source
ON chunks(source_id);

-- =========================================================
-- EMBEDDINGS (PERF-CRITICAL)
-- Note: VECTOR(1536) matches text-embedding-3-small.
-- If switching to text-embedding-3-large (3072d), this must
-- be migrated. Documented as a v1 platform constraint.
-- =========================================================

CREATE TABLE embeddings (
    chunk_id UUID PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    embedding VECTOR(1536) NOT NULL,

    model_name TEXT DEFAULT 'text-embedding-3-small',
    model_version TEXT DEFAULT '1.0',

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_embeddings_project
ON embeddings(project_id);

CREATE INDEX idx_embeddings_hnsw
ON embeddings USING hnsw (embedding vector_cosine_ops);

-- =========================================================
-- CONVERSATIONS
-- =========================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    session_id TEXT,
    message_count INT DEFAULT 0,

    token_usage JSONB DEFAULT '{}'::jsonb,

    started_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conv_project
ON conversations(project_id);

CREATE INDEX idx_conv_session
ON conversations(project_id, session_id);

-- =========================================================
-- MESSAGES
-- =========================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

    role TEXT CHECK (role IN ('user','assistant','system')),
    content TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,
    token_count INT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conv
ON messages(conversation_id);

-- Trigger to update conversation stats
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

CREATE TRIGGER trg_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation();

-- =========================================================
-- CACHE
-- =========================================================

CREATE TABLE cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    cache_key TEXT,
    cache_type TEXT CHECK (cache_type IN ('embedding','response')),

    data JSONB,
    hits INT DEFAULT 0,

    size_bytes INT,
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(project_id, cache_key, cache_type)
);

CREATE INDEX idx_cache_expiry ON cache(expires_at);
CREATE INDEX idx_cache_lookup ON cache(project_id, cache_key, cache_type);

-- =========================================================
-- RETRIEVAL METRICS
-- =========================================================

CREATE TABLE retrieval_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    query_id UUID,  -- Links to conversation
    query_length INT,
    retrieval_time_ms INT,
    chunks_considered INT,
    chunks_returned INT,
    reranker_used BOOLEAN DEFAULT false,
    vector_search_time_ms INT,
    keyword_search_time_ms INT,
    fusion_time_ms INT,
    rerank_time_ms INT,
    cache_hit_rate DECIMAL(5,4),
    avg_vector_score DECIMAL(5,4),
    avg_keyword_score DECIMAL(5,4),
    avg_reranker_score DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_retrieval_metrics_project_time
ON retrieval_metrics(project_id, created_at);

CREATE INDEX idx_retrieval_metrics_performance
ON retrieval_metrics(retrieval_time_ms);

-- =========================================================
-- WIDGET METRICS (RUM TELEMETRY)
-- =========================================================

CREATE TABLE widget_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value NUMERIC(12,4) NOT NULL,
    tags JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_widget_metrics_project_time
ON widget_metrics(project_id, created_at);

-- =========================================================
-- RATE LIMIT AUDIT
-- =========================================================

CREATE TABLE rate_limits (
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    window_type TEXT,
    window_bucket TIMESTAMPTZ,

    request_count INT,
    token_count BIGINT,

    PRIMARY KEY(api_key_id, window_type, window_bucket)
);

-- =========================================================
-- DEAD LETTER QUEUE
-- =========================================================

CREATE TABLE ingestion_dead_letter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID,
    error TEXT,
    payload JSONB,
    attempts INT DEFAULT 0,
    failed_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    detail JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_project
ON audit_logs(project_id);

CREATE INDEX idx_audit_action
ON audit_logs(project_id, action);

CREATE INDEX idx_audit_created
ON audit_logs(created_at);

-- =========================================================
-- DAILY TOKEN BUDGET RESET (run via pg_cron or external cron)
-- Schedule: 0 0 * * * (midnight UTC daily)
-- =========================================================

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

-- To schedule with pg_cron (if available):
-- SELECT cron.schedule('reset-daily-tokens', '0 0 * * *', 'SELECT reset_daily_token_usage()');

-- =========================================================
-- CLEANUP: Expired browser tokens (run via cron)
-- Schedule: */15 * * * * (every 15 minutes)
-- =========================================================

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM browser_tokens
    WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- CLEANUP: Expired cache entries (run via cron)
-- Schedule: 0 * * * * (every hour)
-- =========================================================

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cache
    WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- SOFT DELETE: Purge deleted projects after retention (run via cron)
-- Schedule: 0 3 * * * (3 AM daily)
-- Retention: 30 days after soft delete
-- =========================================================

CREATE OR REPLACE FUNCTION purge_deleted_projects()
RETURNS void AS $$
BEGIN
    DELETE FROM projects
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- AUDIT LOG RETENTION: Purge old logs (run via cron)
-- Schedule: 0 2 * * * (2 AM daily)
-- Retention: 1 year
-- =========================================================

CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < now() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

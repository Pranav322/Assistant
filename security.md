# SECURITY.md — RAG Chatbot Platform (Production)

**Version:** 3.0 (Aligned with schema.sql v2.2)
**Status:** Ready for Implementation
**Last Updated:** 2026-02-11

---

## ⚠️ CRITICAL SECURITY RULES (NON-NEGOTIABLE)

### RULE 1: API Keys Must Use bcrypt, NEVER SHA-256

```python
# ❌ WRONG - DO NOT USE
import hashlib
key_hash = hashlib.sha256(api_key.encode()).hexdigest()  # FAST, CRACKABLE

# ✅ CORRECT - USE THIS
import bcrypt
key_hash = bcrypt.hashpw(api_key.encode(), bcrypt.gensalt(rounds=12))  # SLOW, SECURE
```

**Why:** SHA-256 is designed for speed (data integrity), bcrypt is designed for slowness (password/secret storage). GPUs can crack SHA-256 hashes of API keys in minutes. bcrypt resists GPU cracking.

### RULE 2: All Database Queries Must Filter by `project_id`

```sql
-- ❌ WRONG - This will cause data leaks with PgBouncer
SELECT * FROM chunks WHERE id = 'some-id';

-- ✅ CORRECT - Always include project_id
SELECT * FROM chunks WHERE project_id = :project_id AND id = :chunk_id;
```

**Why:** PgBouncer in transaction pooling mode reuses connections between requests. Session variables like `SET app.current_project_id` are lost. Row-Level Security (RLS) is defense-in-depth, not primary protection.

### RULE 3: Never Store Secrets in Code

```bash
# ❌ WRONG - Hardcoded in Python
JWT_SECRET = "my-secret-key"  # In code

# ✅ CORRECT - Environment variables
import os
JWT_SECRET = os.environ["JWT_SECRET"]  # From environment
```

**Why:** Code gets committed to git, shared, leaked. Environment variables are external configuration.

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### 1. API Keys (Service-to-Service)

**Format:** `chat_{32-char-base64-token}` (e.g., `chat_kF3mN9pQw8vXzY2aB5cD1eR7tU6iO4sL`)

**Storage in Database (`api_keys` table):**

```sql
INSERT INTO api_keys (project_id, key_hash, name, scopes, allowed_origins)
VALUES (
  :project_id,
  -- bcrypt hash of full API key
  '$2b$12$N9qo8uLOickgx2ZMRZoMye...',
  'Production Key',
  '{ingest,query}',
  '{https://example.com}'
);
```

**Verification Logic:**

```python
import bcrypt

def verify_api_key(provided_key: str, stored_bcrypt_hash: str) -> bool:
    # bcrypt.checkpw is timing-safe
    return bcrypt.checkpw(provided_key.encode(), stored_bcrypt_hash.encode())
```

**Key Lifecycle:**

- **Created:** Via project dashboard, stored as bcrypt hash
- **Revoked:** Set `revoked_at = NOW()` in database
- **Expired:** Check `expires_at` if set
- **Rotated:** Generate new key, mark old as `revoked_at`

### 2. Browser Widget Tokens (JWT)

**Purpose:** Short-lived tokens for iframe widgets to authenticate to API.

**Token Structure:**

```json
{
  "sub": "project-uuid",
  "type": "widget_token",
  "origins": ["https://example.com"],
  "iat": 1678832000,
  "exp": 1678918400,
  "jti": "unique-token-id",
  "iss": "chatbot-platform",
  "aud": "widget-api"
}
```

**Validation Rules:**

1. Verify JWT signature with `JWT_SECRET`
2. Check `exp` (must not be expired)
3. Check `origins` matches request `Origin` header
4. Validate audience and issuer
5. Check token not revoked (lookup `browser_tokens.token_hash` where `revoked_at` is set)

**Refresh Flow:** Tokens auto-refresh when <1 hour remaining via `/tokens/refresh` endpoint.

### 3. Origin Validation

**Project Configuration (`projects` table):**

```sql
-- Each project defines allowed origins
UPDATE projects SET allowed_origins = ARRAY['https://example.com'] WHERE id = :project_id;

-- ❌ NEVER use wildcard in production:
-- allowed_origins = ARRAY['*']  -- WRONG
```

**Validation Logic:**

```python
def validate_origin(request_origin: str, allowed_origins: list[str]) -> bool:
    """
    Validate request origin against allowed list.

    Supports:
    - Exact match: 'https://example.com'
    - Subdomain wildcard: 'https://*.example.com'
    """
    if not request_origin:
        return False

    for allowed in allowed_origins:
        if allowed == request_origin:
            return True

        # Handle subdomain wildcards
        if allowed.startswith('https://*.') and request_origin.startswith('https://'):
            domain = allowed[11:]  # Remove 'https://*.'
            if request_origin.endswith(domain):
                return True

    return False
```

> **Note:** Wildcard `*` allowed only in development mode, never production.

---

## 🔒 DATA PROTECTION

### 1. Encryption at Rest (User Secrets)

**What Gets Encrypted:**
- User-provided LLM API keys (OpenAI, Anthropic, etc.)
- External service credentials
- TOTP secrets (if 2FA added later)

**What Doesn't Get Encrypted:**
- Our platform API keys (hashed with bcrypt)
- Configuration settings
- Chat content (tenant isolation protects this)

**Encryption Implementation:**

```python
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

class SecretEncryption:
    def __init__(self):
        # Master key from environment (32 bytes, base64)
        self.master_key = base64.urlsafe_b64decode(os.environ["ENCRYPTION_MASTER_KEY"])

    def _derive_key(self, salt: bytes) -> bytes:
        """Derive encryption key using PBKDF2 with a unique salt."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        return base64.urlsafe_b64encode(kdf.derive(self.master_key))

    def encrypt(self, plaintext: str, context: str) -> dict:
        """
        Encrypt a secret with a unique random salt and context binding.
        Context prevents key reuse across different data types.
        """
        # Generate a unique random salt per encryption operation
        salt = os.urandom(16)

        derived_key = self._derive_key(salt)
        cipher = Fernet(derived_key)
        ciphertext = cipher.encrypt(f"{context}:{plaintext}".encode())

        return {
            "encrypted": base64.b64encode(ciphertext).decode(),
            "salt": base64.b64encode(salt).decode(),  # Store salt alongside ciphertext
            "context": context,
            "version": "2.0"
        }

    def decrypt(self, encrypted_package: dict) -> str:
        """Decrypt a secret, verifying context binding."""
        salt = base64.b64decode(encrypted_package["salt"])
        ciphertext = base64.b64decode(encrypted_package["encrypted"])

        derived_key = self._derive_key(salt)
        cipher = Fernet(derived_key)
        decrypted = cipher.decrypt(ciphertext).decode()

        # Verify context matches
        if not decrypted.startswith(encrypted_package["context"] + ":"):
            raise ValueError("Context mismatch — potential tampering detected")
        return decrypted.split(":", 1)[1]
```

**Database Storage:**

```sql
-- Store encrypted package as JSONB (now includes unique salt)
UPDATE projects SET
  encrypted_openai_key = '{
    "encrypted": "...",
    "salt": "...",
    "context": "openai:project-uuid",
    "version": "2.0"
  }'::jsonb
WHERE id = :project_id;
```

### 2. Transport Security

**TLS/HTTPS Everywhere:**
- API endpoints: HTTPS only
- Widget iframe: HTTPS only
- Database connections: SSL/TLS required
- Redis connections: TLS preferred

**Security Headers (API):**

```python
response.headers.update({
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",  # API shouldn't be framed
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
})
```

**Security Headers (Widget):**

```python
# Content-Security-Policy dynamically generated from project.allowed_origins
def generate_csp(allowed_origins: list[str]) -> str:
    # Convert allowed_origins to CSP frame-ancestors directive
    frame_ancestors = " ".join(["'self'"] + allowed_origins)

    return (
        f"default-src 'self'; "
        f"script-src 'self' 'unsafe-inline'; "
        f"style-src 'self' 'unsafe-inline'; "
        f"frame-ancestors {frame_ancestors}; "
        f"form-action 'none';"
    )
```

### 3. Backup Security

**Daily Encrypted Backups:**

```bash
# 1. Dump database
pg_dump $DATABASE_URL --format=custom | gzip > backup.sql.gz

# 2. Encrypt with GPG (asymmetric)
gpg --encrypt --recipient security@example.com backup.sql.gz

# 3. Upload to S3 with server-side encryption
aws s3 cp backup.sql.gz.gpg s3://backups/ --sse AES256

# 4. Cleanup
rm backup.sql.gz backup.sql.gz.gpg
```

**Retention:** 30 days daily, 12 months monthly.

---

## 🚫 INGESTION SECURITY

### 1. File Upload Protection

**Size Limits (per `projects.settings`):**

```json
{
  "max_file_size_mb": 50,
  "max_pages": 1000,
  "max_total_files": 100
}
```

**Validation Pipeline:**

1. **Size Check:** Reject >50MB immediately
2. **MIME Validation:** Check magic bytes, not extension
3. **Content Scan:** Attempt to parse (PDF → text, HTML → markdown)
4. **Malware Check:** Optional virus scanning service
5. **Storage:** Encrypted at rest in S3-compatible storage

**PDF Security:**

```python
def validate_pdf(content: bytes):
    # 1. Check PDF structure
    if not content.startswith(b"%PDF-"):
        raise ValueError("Not a valid PDF")

    # 2. Parse with resource limits
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        if len(pdf.pages) > 1000:
            raise ValueError("Too many pages")

        # 3. Check for JavaScript (malicious PDFs)
        if "/JavaScript" in str(pdf.trailer):
            raise ValueError("PDF contains JavaScript")

    # 4. Store with content_hash for deduplication
    content_hash = hashlib.sha256(content).hexdigest()
```

### 2. URL/SSRF Protection

**Blocked Targets:**
- Private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Localhost (`127.0.0.0/8`, `::1`)
- Link-local (`169.254.0.0/16`)
- Cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`)
- `file://`, `ftp://`, other non-HTTP(S) schemes

**Secure Fetching:**

```python
async def fetch_url_safely(url: str):
    # 1. Parse and validate URL
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Invalid scheme")

    # 2. DNS resolution with IP validation
    hostname = parsed.hostname
    ips = await resolve_dns(hostname)

    for ip in ips:
        if is_private_ip(ip):
            raise ValueError(f"Private IP: {hostname} → {ip}")

    # 3. Fetch with timeouts and size limits
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=30, max_redirects=5) as resp:
            if resp.status != 200:
                raise ValueError(f"HTTP {resp.status}")

            # Read with limit
            content = await resp.read(limit=50*1024*1024)
            return content
```

### 3. Container Sandbox for Processing

**Docker Configuration:**

```dockerfile
# Dockerfile.processor
FROM python:3.11-slim

# Non-root user
RUN useradd -m -u 1000 processor

# Minimal packages
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

USER processor
CMD ["python", "processor.py"]
```

**Container Runtime Restrictions:**

```yaml
# docker-compose.yml
services:
  pdf-processor:
    build: .
    read_only: true
    network_mode: "none"  # No network access
    security_opt:
      - "no-new-privileges:true"
      - "apparmor:docker-default"
    cap_drop:
      - ALL  # Drop all capabilities
    tmpfs:
      - /tmp:size=100m,noexec,nodev,nosuid
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
```

---

## ⚡ RATE LIMITING

### Three-Layer Protection

**Layer 1: IP-based (Global Abuse)**
- 1000 requests/minute per IP
- Redis key: `ratelimit:ip:1.2.3.4`
- Protects against DDoS and scanning

**Layer 2: API Key-based (Project-level)**
- Defined in `api_keys.rate_limit` (default: 60/min, 100K tokens/min)
- Redis key: `ratelimit:apikey:key-prefix`
- Protects against misbehaving projects

**Layer 3: Endpoint-based (Resource Protection)**
- Chat: 30 requests/minute
- Ingestion: 10 requests/minute
- Token refresh: 1000 requests/minute
- Redis key: `ratelimit:endpoint:chat:project-id`

**Implementation:**

```python
class RateLimiter:
    async def check(self, ip: str, api_key: str, endpoint: str, project_id: str):
        # Check all three layers
        if not await self.check_ip(ip):
            await log_security_event("rate_limit_ip", ip=ip)
            return False

        if not await self.check_api_key(api_key):
            await log_security_event("rate_limit_api_key", api_key=api_key[:12])
            return False

        if not await self.check_endpoint(endpoint, project_id):
            await log_security_event("rate_limit_endpoint", project_id=project_id, endpoint=endpoint)
            return False

        return True

    async def check_ip(self, ip: str):
        key = f"ratelimit:ip:{ip}"
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, 60)
        return current <= 1000
```

### Token Budget Protection

```sql
-- Track in database (projects.usage)
UPDATE projects SET
  usage = jsonb_set(usage, '{tokens_today}', to_jsonb(COALESCE((usage->>'tokens_today')::int, 0) + :tokens))
WHERE id = :project_id;

-- Check before processing
SELECT
  (settings->>'token_budget_daily')::int as daily_budget,
  (usage->>'tokens_today')::int as used_today
FROM projects
WHERE id = :project_id;
```

### Daily Token Budget Reset

The token budget resets automatically at midnight UTC via the `reset_daily_token_usage()` function defined in `schema.sql`. Schedule with:

```bash
# Option A: pg_cron (recommended if available)
SELECT cron.schedule('reset-daily-tokens', '0 0 * * *', 'SELECT reset_daily_token_usage()');

# Option B: System cron
0 0 * * * psql $DATABASE_URL -c "SELECT reset_daily_token_usage()"

# Option C: Dramatiq periodic task
@dramatiq.actor(periodic=crontab(hour=0, minute=0))
def reset_daily_tokens():
    db.execute("SELECT reset_daily_token_usage()")
```

---

## 🛡️ WIDGET SECURITY

**Iframe Embedding:**

```html
<!-- Customer embeds this -->
<script src="https://widget.chatbot.com/embed.js?project=project-slug"></script>

<!-- Generates: -->
<div id="chatbot-widget-container">
  <iframe
    src="https://widget.chatbot.com/widget.html?token=jwt-token"
    sandbox="allow-scripts allow-same-origin allow-forms"
    style="border: none;"
  ></iframe>
</div>
```

**postMessage Protocol:**

```javascript
// Widget iframe -> Parent page
window.parent.postMessage({
  type: "chatbot:message",
  payload: { text: "Hello", sessionId: "..." },
  requestId: "unique-id",
  timestamp: "2026-02-12T10:30:00Z"
}, "https://customer-domain.com");  // Specific target origin

// Parent page -> Widget iframe
iframe.contentWindow.postMessage({
  type: "chatbot:response",
  payload: { reply: "Hi there!" },
  requestId: "unique-id",
  timestamp: "2026-02-12T10:30:01Z"
}, "https://widget.chatbot.com");  // Specific target origin
```

**Validation Rules:**
1. Validate origin on both sides
2. Check timestamp (reject old messages)
3. Validate `requestId` format
4. Rate limit message frequency

---

## 📊 AUDIT LOGGING

**What Gets Logged (`audit_logs` table):**
- **Authentication:** Success/failure, token refresh
- **Authorization:** Access denied, origin mismatch
- **Data Access:** Source/chunk retrieval, conversation access
- **Modifications:** File upload, deletion, settings change
- **Security Events:** Rate limit hits, suspicious patterns

**Log Structure:**

```sql
INSERT INTO audit_logs (
  project_id,
  user_id,
  action,           -- e.g., 'api_key_created', 'file_uploaded'
  resource_type,    -- 'api_key', 'source', 'chunk'
  resource_id,      -- UUID of affected resource
  detail,           -- JSON with context (redacted)
  ip_address,       -- Client IP (INET type)
  user_agent,       -- Browser/agent string
  created_at
) VALUES (...);
```

**Redaction Rules:**

```python
def redact_sensitive(data: dict) -> dict:
    redacted = data.copy()

    # Remove secrets
    for key in ['api_key', 'password', 'token', 'secret']:
        if key in redacted:
            redacted[key] = '[REDACTED]'

    # Mask email
    if 'email' in redacted:
        email = redacted['email']
        if '@' in email:
            name, domain = email.split('@', 1)
            if len(name) > 2:
                masked = name[0] + '*' * (len(name) - 2) + name[-1]
                redacted['email'] = f'{masked}@{domain}'

    return redacted
```

**Retention:**
- 1 year in database
- 7 years in cold storage (compressed, encrypted)
- Automatic cleanup via scheduled job

---

## 🚨 INCIDENT RESPONSE

### Severity Levels

| Level | Example | Response | Timeline |
|---|---|---|---|
| **1 (Low)** | Single failed login, rate limit warning | Log, monitor | Review within 24h |
| **2 (Medium)** | Multiple failed logins, suspicious upload | Investigate, rotate keys, notify owner | Respond within 4h |
| **3 (High)** | Data breach suspected, RCE attempt | Freeze writes, forensic log, rotate all secrets | Respond within 15min |

**Response Playbook:**

```python
async def handle_security_incident(event: SecurityEvent):
    if event.severity == "high":
        # 1. Freeze writes
        await redis.set("freeze_writes", "true", ex=3600)

        # 2. Enable forensic logging
        await enable_verbose_logging()

        # 3. Rotate platform secrets
        await rotate_jwt_secret()
        await rotate_encryption_key()

        # 4. Preserve evidence
        await snapshot_database()

        # 5. Notify
        await notify_security_team()
        if event.affects_users:
            await notify_affected_users()
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Production

- [ ] API keys using bcrypt (not SHA-256)
- [ ] All database queries include `WHERE project_id = :project_id`
- [ ] JWT tokens with 24-hour expiry
- [ ] Origin validation enabled
- [ ] Content-Security-Policy headers
- [ ] Rate limiting implemented (all 3 layers)
- [ ] Audit logging enabled
- [ ] Backup encryption configured
- [ ] SSRF protection for URL ingestion
- [ ] File upload size limits
- [ ] Container sandbox for processing
- [ ] Daily token budget reset cron scheduled

### Post-Deployment

- [ ] Security headers verified ([securityheaders.com](https://securityheaders.com))
- [ ] Rate limit testing
- [ ] Origin validation testing
- [ ] Audit log review
- [ ] Backup restoration test
- [ ] Incident response drill

### Monitoring

```python
# Key security metrics
SECURITY_METRICS = [
    "auth_failures_per_minute",
    "rate_limit_hits_per_minute",
    "origin_mismatches_per_minute",
    "file_rejections_per_minute",
    "token_refresh_rate",
    "unusual_peak_detected",
]
```

---

## 🔄 COMPLIANCE SUPPORT

**Data Export (GDPR/CCPA):**

```python
@router.get("/projects/{id}/export")
async def export_project_data(id: str, format: str = "json"):
    # Verify authorization
    if request.state.project_id != id:
        raise HTTPException(403)

    # Export all project data
    data = {
        "project": await get_project(id),
        "sources": await get_sources(id),
        "conversations": await get_conversations(id),
        "api_keys": await get_api_keys(id),
    }

    return data
```

**Data Deletion:**

```sql
-- Soft delete (mark as deleted)
UPDATE projects SET deleted_at = NOW() WHERE id = :project_id;

-- Hard delete after retention period (automated via purge_deleted_projects() in schema.sql)
-- Runs daily at 3 AM, purges projects soft-deleted >30 days ago
```

**Retention Defaults:**
- Chat conversations: 30 days
- Uploaded files: Keep until deleted
- Audit logs: 1 year
- Backups: 30 days daily, 12 months monthly

---

## 🔧 TECHNICAL ALIGNMENT WITH schema.sql v2.2

### Security-Relevant Tables

**1. `api_keys` table:**

```sql
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
```

**2. `browser_tokens` table:**

```sql
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
```

**3. `audit_logs` table:**

```sql
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
```

**4. `projects` table (security settings):**

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    allowed_origins TEXT[] DEFAULT '{}',  -- For CSP and origin validation
    settings JSONB DEFAULT '{}'::jsonb,   -- Security settings
    usage JSONB DEFAULT '{}'::jsonb,      -- Token budget tracking
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,              -- Soft delete (GDPR/CCPA)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Row-Level Security (RLS) Policies (Optional)

```sql
-- RLS is optional and NOT enabled by default in schema.sql.
-- Enable only if you are setting app.current_user_id per request.
--
-- ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Policy example (defense-in-depth only!)
CREATE POLICY chunks_isolation ON chunks
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects
            WHERE owner_id = current_setting('app.current_user_id', true)::UUID
        )
    );
```

> **⚠️ REMEMBER:** RLS is NOT sufficient with PgBouncer transaction pooling. Application MUST include `WHERE project_id = :project_id`.

---

## 🚀 GETTING STARTED

### Step 1: Environment Variables

```bash
# REQUIRED for production
export ENCRYPTION_MASTER_KEY="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 48)"
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
export REDIS_URL="redis://:pass@host:6379/0"

# OPTIONAL (with defaults)
export RATE_LIMIT_REQUESTS_PER_MINUTE="60"
export RATE_LIMIT_TOKENS_PER_MINUTE="100000"
export MAX_FILE_SIZE_MB="50"
```

### Step 2: Database Setup

```bash
# 1. Run schema.sql
psql $DATABASE_URL -f schema.sql

# 2. Schedule cron jobs (if using pg_cron)
psql $DATABASE_URL -c "SELECT cron.schedule('reset-daily-tokens', '0 0 * * *', 'SELECT reset_daily_token_usage()');"
psql $DATABASE_URL -c "SELECT cron.schedule('cleanup-tokens', '*/15 * * * *', 'SELECT cleanup_expired_tokens()');"
psql $DATABASE_URL -c "SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache()');"
psql $DATABASE_URL -c "SELECT cron.schedule('purge-deleted', '0 3 * * *', 'SELECT purge_deleted_projects()');"
psql $DATABASE_URL -c "SELECT cron.schedule('purge-audit-logs', '0 2 * * *', 'SELECT purge_old_audit_logs()');"

# 3. Create initial admin user
psql $DATABASE_URL -c "INSERT INTO users (email, password_hash) VALUES ('admin@example.com', '\$2b\$12\$...');"
```

### Step 3: Verify Security

```bash
# Test API key hashing
python -c "import bcrypt; print(bcrypt.gensalt(rounds=12))"

# Test JWT generation
python -c "import jwt, os; print(jwt.encode({'test':1}, os.environ['JWT_SECRET']))"

# Test origin validation
curl -H "Origin: https://example.com" https://api.yourdomain.com/health
```

---

## 📞 SECURITY CONTACTS

- **For Security Issues:** security@yourdomain.com
- **PGP Key:** Available at `https://yourdomain.com/security.txt`
- **Response Time:** <24 hours for security reports
- **Business Hours:** 9 AM - 5 PM EST
- **Emergency Contact:** +1-XXX-XXX-XXXX (Security team only)

---

## 📝 DOCUMENT HISTORY

| Version | Date | Changes |
|---|---|---|
| **v3.0** | 2026-02-11 | Fixed encryption salt (random per-op), aligned all tables with schema.sql v2.2, added token budget reset mechanism, added cron job scheduling, improved markdown formatting |
| v2.1 | 2026-02-12 | Final production version |
| v2.0 | 2026-02-11 | Major revision with bcrypt fix, SSRF protection |
| v1.0 | 2026-02-10 | Initial security specification |

**Next Review:** 2026-05-12 (Quarterly security review)

---

## ✅ FINAL CHECK

Before going to production, verify:

- [ ] API keys use bcrypt (not SHA-256)
- [ ] All database queries filter by `project_id`
- [ ] JWT tokens expire within 24 hours
- [ ] Origin validation rejects unauthorized domains
- [ ] CSP headers are dynamically generated from `allowed_origins`
- [ ] Rate limiting is enabled on all endpoints (3 layers)
- [ ] Audit logging captures security events with redaction
- [ ] Backups are encrypted and tested
- [ ] SSRF protection blocks internal IPs
- [ ] File uploads have size and type limits
- [ ] Encryption uses random salt per operation (not fixed)
- [ ] Daily token budget reset cron is scheduled
- [ ] Expired token/cache cleanup crons are scheduled

**If all checks pass → Deploy to production.** ✅

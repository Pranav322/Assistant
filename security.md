FINAL PRODUCTION SECURITY SPECIFICATION
markdown
# SECURITY.md — RAG Chatbot Platform (Production)
**Version:** 2.1 (Aligned with schema.sql v1.0)
**Status:** Ready for Implementation
**Last Updated:** 2026-02-12

---

## **⚠️ CRITICAL SECURITY RULES (NON-NEGOTIABLE)**

### **RULE 1: API Keys Must Use bcrypt, NEVER SHA-256**
```python
# ❌ WRONG - DO NOT USE
import hashlib
key_hash = hashlib.sha256(api_key.encode()).hexdigest()  # FAST, CRACKABLE

# ✅ CORRECT - USE THIS
import bcrypt
key_hash = bcrypt.hashpw(api_key.encode(), bcrypt.gensalt(rounds=12))  # SLOW, SECURE
Why: SHA-256 is designed for speed (data integrity), bcrypt is designed for slowness (password/secret storage). GPUs can crack SHA-256 hashes of API keys in minutes. bcrypt resists GPU cracking.

RULE 2: All Database Queries Must Filter by project_id
sql
-- ❌ WRONG - This will cause data leaks with PgBouncer
SELECT * FROM chunks WHERE id = 'some-id';

-- ✅ CORRECT - Always include project_id
SELECT * FROM chunks WHERE project_id = :project_id AND id = :chunk_id;
Why: PgBouncer in transaction pooling mode reuses connections between requests. Session variables like SET app.current_project_id are lost. Row-Level Security (RLS) is defense-in-depth, not primary protection.

RULE 3: Never Store Secrets in Code
bash
# ❌ WRONG - Hardcoded in Python
JWT_SECRET = "my-secret-key"  # In code

# ✅ CORRECT - Environment variables
import os
JWT_SECRET = os.environ["JWT_SECRET"]  # From environment
Why: Code gets committed to git, shared, leaked. Environment variables are external configuration.

🔐 AUTHENTICATION & AUTHORIZATION
1. API Keys (Service-to-Service)
Format: chat_{32-char-base64-token} (e.g., chat_kF3mN9pQw8vXzY2aB5cD1eR7tU6iO4sL)

Storage in Database (api_keys table):

sql
-- Store bcrypt hash, not SHA-256
INSERT INTO api_keys (project_id, key_hash, name, scopes)
VALUES (
  :project_id,
  -- bcrypt hash of full API key
  '$2b$12$N9qo8uLOickgx2ZMRZoMye.KdG9rC3b6C5C5S5S5S5S5S5S5S5S5S',
  'Production Key',
  '{ingest,query}'
);
Verification Logic:

python
import bcrypt

def verify_api_key(provided_key: str, stored_bcrypt_hash: str) -> bool:
    # bcrypt.checkpw is timing-safe
    return bcrypt.checkpw(provided_key.encode(), stored_bcrypt_hash.encode())
Key Lifecycle:

Created: Via project dashboard, stored as bcrypt hash

Revoked: Set revoked_at = NOW() in database

Expired: Check expires_at if set

Rotated: Generate new key, mark old as revoked_at

2. Browser Widget Tokens (JWT)
Purpose: Short-lived tokens for iframe widgets to authenticate to API.

Token Structure:

json
{
  "sub": "project-uuid",           // Project ID from projects table
  "type": "widget_token",          // Token type
  "origins": ["https://example.com"],  // Allowed origins from projects.allowed_origins
  "iat": 1678832000,               // Issued at (Unix timestamp)
  "exp": 1678918400,               // Expires at (24 hours max)
  "jti": "unique-token-id",        // Unique identifier
  "iss": "chatbot-platform",       // Issuer
  "aud": "widget-api"              // Audience
}
Validation Rules:

Verify JWT signature with JWT_SECRET

Check exp (must not be expired)

Check origins matches request Origin header

Validate audience and issuer

Check token not in revocation list (rare, for emergencies)

Refresh Flow: Tokens auto-refresh when <1 hour remaining via /tokens/refresh endpoint.

3. Origin Validation
Project Configuration (projects table):

sql
-- Each project defines allowed origins
UPDATE projects SET allowed_origins = ARRAY['https://example.com'] WHERE id = :project_id;

-- ❌ NEVER use wildcard in production:
-- allowed_origins = ARRAY['*']  -- WRONG
Validation Logic:

python
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
            # Check if request_origin ends with the domain after wildcard
            domain = allowed[11:]  # Remove 'https://*.'
            if request_origin.endswith(domain):
                return True
    
    return False
Note: Wildcard * allowed only in development mode, never production.

🔒 DATA PROTECTION
1. Encryption at Rest (User Secrets)
What Gets Encrypted:

User-provided LLM API keys (OpenAI, Anthropic, etc.)

External service credentials

TOTP secrets (if 2FA added later)

What Doesn't Get Encrypted:

Our platform API keys (hashed with bcrypt)

Configuration settings

Chat content (tenant isolation protects this)

Encryption Implementation:

python
from cryptography.fernet import Fernet  # Uses AES-128-CBC + HMAC-SHA256

class SecretEncryption:
    def __init__(self):
        # Master key from environment (32 bytes, base64)
        key = base64.urlsafe_b64decode(os.environ["ENCRYPTION_MASTER_KEY"])
        
        # Derive key with PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"chatbot-encryption",  # Fixed salt in env var
            iterations=100000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(key))
        self.cipher = Fernet(derived_key)
    
    def encrypt(self, plaintext: str, context: str) -> dict:
        # Context binding prevents key reuse across different data types
        ciphertext = self.cipher.encrypt(f"{context}:{plaintext}".encode())
        return {
            "encrypted": base64.b64encode(ciphertext).decode(),
            "context": context,
            "version": "1.0"
        }
    
    def decrypt(self, encrypted_package: dict) -> str:
        ciphertext = base64.b64decode(encrypted_package["encrypted"])
        decrypted = self.cipher.decrypt(ciphertext).decode()
        # Verify context matches
        if not decrypted.startswith(encrypted_package["context"] + ":"):
            raise ValueError("Context mismatch")
        return decrypted.split(":", 1)[1]
Database Storage:

sql
-- Store encrypted package as JSONB
UPDATE projects SET 
  encrypted_openai_key = '{"encrypted": "...", "context": "openai:project-uuid", "version": "1.0"}'::jsonb
WHERE id = :project_id;
2. Transport Security
TLS/HTTPS Everywhere:

API endpoints: HTTPS only

Widget iframe: HTTPS only

Database connections: SSL/TLS required

Redis connections: TLS preferred

Security Headers (API):

python
response.headers.update({
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",  # API shouldn't be framed
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
})
Security Headers (Widget):

python
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
3. Backup Security
Daily Encrypted Backups:

bash
# 1. Dump database
pg_dump $DATABASE_URL --format=custom | gzip > backup.sql.gz

# 2. Encrypt with GPG (asymmetric)
gpg --encrypt --recipient security@example.com backup.sql.gz

# 3. Upload to S3 with server-side encryption
aws s3 cp backup.sql.gz.gpg s3://backups/ --sse AES256

# 4. Cleanup
rm backup.sql.gz backup.sql.gz.gpg
Retention: 30 days daily, 12 months monthly.

🚫 INGESTION SECURITY
1. File Upload Protection
Size Limits (per projects.settings):

json
{
  "max_file_size_mb": 50,
  "max_pages": 1000,
  "max_total_files": 100
}
Validation Pipeline:

Size Check: Reject >50MB immediately

MIME Validation: Check magic bytes, not extension

Content Scan: Attempt to parse (PDF → text, HTML → markdown)

Malware Check: Optional virus scanning service

Storage: Encrypted at rest in S3-compatible storage

PDF Security:

python
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
2. URL/SSRF Protection
Blocked Targets:

Private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)

Localhost (127.0.0.0/8, ::1)

Link-local (169.254.0.0/16)

Cloud metadata endpoints (169.254.169.254, metadata.google.internal)

File://, ftp://, other non-HTTP(S) schemes

Secure Fetching:

python
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
3. Container Sandbox for Processing
Docker Configuration:

dockerfile
# Dockerfile.processor
FROM python:3.11-slim

# Non-root user
RUN useradd -m -u 1000 processor

# Minimal packages
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

USER processor
CMD ["python", "processor.py"]
Container Runtime Restrictions:

yaml
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
⚡ RATE LIMITING
Three-Layer Protection:
Layer 1: IP-based (Global Abuse)

1000 requests/minute per IP

Redis key: ratelimit:ip:1.2.3.4

Protects against DDoS and scanning

Layer 2: API Key-based (Project-level)

Defined in api_keys.rate_limit (default: 60/min, 100K tokens/min)

Redis key: ratelimit:apikey:key-prefix

Protects against misbehaving projects

Layer 3: Endpoint-based (Resource Protection)

Chat: 30 requests/minute

Ingestion: 10 requests/minute

Token refresh: 1000 requests/minute

Redis key: ratelimit:endpoint:chat:project-id

Implementation:
python
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
Token Budget Protection:
sql
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
🛡️ WIDGET SECURITY
Iframe Embedding:
html
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
postMessage Protocol:
javascript
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
Validation Rules:

Validate origin on both sides

Check timestamp (reject old messages)

Validate requestId format

Rate limit message frequency

📊 AUDIT LOGGING
What Gets Logged (audit_logs table):
Authentication: Success/failure, token refresh

Authorization: Access denied, origin mismatch

Data Access: Source/chunk retrieval, conversation access

Modifications: File upload, deletion, settings change

Security Events: Rate limit hits, suspicious patterns

Log Structure:
sql
INSERT INTO audit_logs (
  project_id,
  user_id,
  action,           -- e.g., 'api_key_created', 'file_uploaded'
  resource_type,    -- 'api_key', 'source', 'chunk'
  resource_id,      -- UUID of affected resource
  detail,           -- JSON with context
  ip_address,       -- Client IP (INET type)
  user_agent,       -- Browser/agent string
  created_at
) VALUES (...);
Redaction Rules:
python
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
Retention:
1 year in database

7 years in cold storage (compressed, encrypted)

Automatic cleanup via scheduled job

🚨 INCIDENT RESPONSE
Severity Levels:
Level 1 (Low): Minor security event

Example: Single failed login, rate limit warning

Response: Log, monitor, no immediate action

Timeline: Review within 24 hours

Level 2 (Medium): Potential security issue

Example: Multiple failed logins, suspicious upload

Response: Investigate, rotate affected keys, notify project owner

Timeline: Respond within 4 hours

Level 3 (High): Active security incident

Example: Data breach suspected, RCE attempt

Response: Freeze writes, forensic logging, rotate all secrets, legal notification

Timeline: Respond within 15 minutes, notify users within 24 hours

Response Playbook:
python
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
📋 DEPLOYMENT CHECKLIST
Pre-Production:
API keys using bcrypt (not SHA-256)

All database queries include WHERE project_id = :project_id

JWT tokens with 24-hour expiry

Origin validation enabled

Content-Security-Policy headers

Rate limiting implemented

Audit logging enabled

Backup encryption configured

SSRF protection for URL ingestion

File upload size limits

Container sandbox for processing

Post-Deployment:
Security headers verified (securityheaders.com)

Rate limit testing

Origin validation testing

Audit log review

Backup restoration test

Incident response drill

Monitoring:
python
# Key security metrics
SECURITY_METRICS = [
    "auth_failures_per_minute",
    "rate_limit_hits_per_minute",
    "origin_mismatches_per_minute",
    "file_rejections_per_minute",
    "token_refresh_rate",
    "unusual_peak_detected",
]
🔄 COMPLIANCE SUPPORT
Data Export (GDPR/CCPA):
python
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
Data Deletion:
sql
-- Soft delete (mark as deleted)
UPDATE projects SET deleted_at = NOW() WHERE id = :project_id;

-- Hard delete after retention period (cron job)
DELETE FROM projects 
WHERE deleted_at < NOW() - INTERVAL '30 days';
Retention Defaults:
Chat conversations: 30 days

Uploaded files: Keep until deleted

Audit logs: 1 year

Backups: 30 days daily, 12 months monthly

🔧 TECHNICAL ALIGNMENT WITH schema.sql
Security-Relevant Tables:
1. api_keys table:

sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,  -- bcrypt hash of API key
    name TEXT,
    allowed_origins TEXT[] DEFAULT '{}',
    scopes TEXT[] DEFAULT '{ingest,query}',
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
2. browser_tokens table:

sql
CREATE TABLE browser_tokens (
    id UUID PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,  -- SHA256 of JWT token (for revocation)
    origin TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
3. audit_logs table:

sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,        -- e.g., 'api_key_created'
    resource_type TEXT,          -- 'api_key', 'source'
    resource_id TEXT,            -- UUID of affected resource
    detail JSONB DEFAULT '{}',   -- Redacted context
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
4. projects table (security settings):

sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allowed_origins TEXT[] DEFAULT '{}',  -- For CSP and origin validation
    settings JSONB DEFAULT '{}',          -- Security settings here
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
Row-Level Security (RLS) Policies:
sql
-- Enable RLS on all tenant tables
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Policy example (defense-in-depth only!)
CREATE POLICY chunks_isolation ON chunks
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = current_setting('app.current_user_id', true)::UUID
        )
    );
⚠️ REMEMBER: RLS is NOT sufficient with PgBouncer transaction pooling. Application MUST include WHERE project_id = :project_id.

🚀 GETTING STARTED
Step 1: Environment Variables
bash
# REQUIRED for production
export ENCRYPTION_MASTER_KEY="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 48)"
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
export REDIS_URL="redis://:pass@host:6379/0"

# OPTIONAL (with defaults)
export RATE_LIMIT_REQUESTS_PER_MINUTE="60"
export RATE_LIMIT_TOKENS_PER_MINUTE="100000"
export MAX_FILE_SIZE_MB="50"
Step 2: Database Setup
bash
# 1. Run schema.sql
psql $DATABASE_URL -f schema.sql

# 2. Create initial admin user
INSERT INTO users (email, password_hash) VALUES (
  'admin@example.com',
  -- bcrypt hash of password
  '$2b$12$...'
);
Step 3: Verify Security
bash
# Test API key hashing
python -c "import bcrypt; print(bcrypt.gensalt(rounds=12))"

# Test JWT generation
python -c "import jwt, os; print(jwt.encode({'test':1}, os.environ['JWT_SECRET']))"

# Test origin validation
curl -H "Origin: https://example.com" https://api.yourdomain.com/health
📞 SECURITY CONTACTS
For Security Issues: security@yourdomain.com
PGP Key: Available at https://yourdomain.com/security.txt
Response Time: <24 hours for security reports

Business Hours: 9 AM - 5 PM EST
Emergency Contact: +1-XXX-XXX-XXXX (Security team only)

📝 DOCUMENT HISTORY
v2.1 (2026-02-12): Final production version, aligned with schema.sql

v2.0 (2026-02-11): Major revision with bcrypt fix, SSRF protection

v1.0 (2026-02-10): Initial security specification

Next Review: 2026-05-12 (Quarterly security review)

✅ FINAL CHECK
Before going to production, verify:

API keys use bcrypt (not SHA-256)

All database queries filter by project_id

JWT tokens expire within 24 hours

Origin validation rejects unauthorized domains

CSP headers are dynamically generated from allowed_origins

Rate limiting is enabled on all endpoints

Audit logging captures security events

Backups are encrypted and tested

SSRF protection blocks internal IPs

File uploads have size and type limits

If all checks pass → Deploy to production.

text


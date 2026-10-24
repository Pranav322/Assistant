# Restarting Contextly after the Azure shutdown

Written 2026-10-25 from a read-only audit. Nothing in this repo was changed except this file.

> **Interim (2026-10-25):** the site shows a waitlist page instead of login while the backend is down; emails are collected by a Cloudflare Worker + D1 (`waitlist-worker/`). See AGENTS.md "Waitlist mode" for how to turn it off.

## What is alive and what is dead (verified 2026-10-25)

| Piece | State | Evidence |
|---|---|---|
| `contextly.live` frontend (Vercel) | **Alive** | HTTP 200 from Vercel IPs |
| `api.contextly.live` backend | **Dead** | DNS points at `20.192.11.41` (Azure VM `latency-test-vm-in`, stopped); connection fails |
| DNS zone `contextly.live` | **Alive, in the Cloudflare account `Pranav88096@gmail.com`** (same one wrangler is logged into) | `wrangler`/API zone list |
| R2 bucket `rag-chatbot` (uploaded files) | **Alive**: 69 objects, 64 MB | `wrangler r2 bucket info` |
| Azure OpenAI (`gpt-5-mini`, `text-embedding-3-small`) | **Gone** with the disabled subscription | Azure CLI |
| VM disk with `/opt/Assistant/backend/.env` and the Firebase JSON | **Unreachable** (VM stopped, subscription read-only) | Azure export README |
| Neon Postgres, Firebase project `contextly-86e4d`, Razorpay, Vercel project | Presumed alive, **not verified** (no access from here) | n/a |

## What the backend actually needs

FastAPI API + one Dramatiq worker + Redis, plus: Neon Postgres with pgvector, an
OpenAI-compatible chat model, an embedding model, an S3-compatible bucket (R2), Firebase
Admin, Razorpay, SMTP. No ML libraries, so it is light (7.1k lines of Python); a
2 GB machine is enough. Only the LLM/embedding client is Azure-specific
(`AsyncAzureOpenAI` in `app/services/embedding.py`, `chat.py`, `retrieval.py`).

## Checklist to restart

### 1. Recover or recreate secrets (all lived only in the VM's `.env`)
| Secret | Where to get it |
|---|---|
| `DATABASE_URL` | Neon console → project → Connection details (check the project still exists) |
| `JWT_SECRET`, `ADMIN_API_KEY` | Generate new (invalidates old sessions; widget tokens self-heal) |
| Firebase service-account JSON | Firebase console → project `contextly-86e4d` → Service accounts → Generate key. Must be at `backend/contextly-86e4d-firebase-adminsdk-fbsvc-ee1a051661.json` at build time or set `FIREBASE_CREDENTIALS_PATH` |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET=rag-chatbot`, `S3_PUBLIC_URL` | Cloudflare dashboard → R2 → Manage R2 API tokens (Object Read & Write, bucket `rag-chatbot`). Endpoint is `https://8a2cef39862f19036324a81881b974a9.r2.cloudflarestorage.com` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay dashboard → API keys |
| SMTP creds (if email is used) | Your mail provider |
| LLM + embedding credentials | See step 2 (none needed if you use a Cloudflare Worker with an AI binding) |

Fastest recovery of the old values: if the Azure subscription is re-enabled (fix billing),
start `latency-test-vm-in` and copy `/opt/Assistant/backend/.env` and the Firebase JSON.
The SSH key `~/Downloads/deepdoc-fix-vm_key.pem` is **not on this Mac**.

### 2. Replace Azure OpenAI with Workers AI (free tier)
Verified from this account on 2026-10-25 via the OpenAI-compatible endpoint
`https://api.cloudflare.com/client/v4/accounts/<id>/ai/v1`:
- embeddings `@cf/baai/bge-m3` returns **1024** dims (`@cf/baai/bge-base-en-v1.5` returns 768)
- chat `@cf/openai/gpt-oss-20b` works (a reasoning model: give it generous `max_tokens`);
  `@cf/meta/llama-3.1-8b-instruct-fp8-fast` answered wrongly, too weak for RAG answers
- Free allowance: 10,000 neurons/day. Measured: an 80-in/120-out gpt-oss-20b call = 4.7 neurons.
  A real RAG answer (about 2k prompt tokens) is roughly 40 neurons, so on the order of 200 chats/day free.

Code changes (small, testable): swap `AsyncAzureOpenAI` for `AsyncOpenAI(base_url=..., api_key=...)`
in the three services, add `LLM_BASE_URL/LLM_API_KEY/LLM_MODEL` and `EMBEDDING_*` settings, drop the
Azure-only `max_completion_tokens` special-casing if needed.

**Embedding dimension problem:** `app/models/document.py` has `Vector(1536)` and all stored
chunks were embedded with `text-embedding-3-small`. A different model cannot search them.
Either (a) migrate the column to 1024 and re-embed existing chunk text, or (b) keep 1536 by using
OpenAI's `text-embedding-3-small` directly (paid, about $0.02 per million tokens). If the DB holds only demo data,
re-ingesting is simplest.

Credential-free option: a tiny Cloudflare Worker with the `AI` binding that exposes
`/v1/chat/completions` and `/v1/embeddings` behind a shared secret, so the backend needs no Cloudflare API token.

### 3. Pick one compute host (the only non-free-tier piece left)
Needs about 2 GB RAM and a public IP. API + worker + Redis run with the existing
`backend/docker-compose.yml` and Caddy.
- **Oracle Cloud Always Free** (Ampere A1, 4 OCPU / 24 GB): truly $0, but you must sign up (card check)
  and A1 capacity is sometimes unavailable in a region.
- **AWS EC2 `t4g.small`** on the $140 credits: about $12/month (roughly 10 months of credit). No signup,
  can be done in one session, but not strictly free tier.

### 4. DNS
Point `api.contextly.live` (currently `20.192.11.41`) at the new host in the Cloudflare dashboard.
The wrangler login cannot edit DNS (scopes: zone read only). `watch.contextly.live` can be left or deleted
(observability was never brought up on the Azure VM).

### 5. CI deploy
`.github/workflows/deploy.yml` SSHes into the VM using `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`,
`VPS_PROJECT_PATH` (environment `deploy-ssh`). Update those secrets for the new host. Set them from the
`Pranav322` account (the repo owner).

### 6. Frontend and billing
Frontend is on Vercel and needs no change if the API stays at `api.contextly.live`; check Vercel env
(`NEXT_PUBLIC_*`, Firebase web config). Razorpay webhook URL does not change either. Note Vercel Hobby
is for non-commercial use, and this app sells a Pro plan.

### 7. After it is up
Run `uv run pytest tests/`, hit `/health`, create a project, upload a file, ask a question through the widget.

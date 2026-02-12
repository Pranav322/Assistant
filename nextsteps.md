# Next Steps

## Must fix for local end-to-end
- [x] Rebuild API + worker after backend changes.
- [x] Use the correct token endpoint path and protocol (HTTP + `/api/v1`).
- [x] Ensure project allowed origins include `http://localhost:3000`.

Example:
```
curl -X POST http://localhost:8001/api/v1/tokens/widget \
  -H "X-API-Key: chat_..." \
  -H "Content-Type: application/json" \
  -d '{"origin":"http://localhost:3000","project_id":"<PROJECT_ID>"}'
```

## UX: remove curl from user flow
- [x] Add a backend endpoint that mints widget tokens using a user JWT.
- [x] Add a dashboard button: “Generate token”.
- [x] Replace the curl example with the generated token + preview link.
- [x] Keep API key examples in docs only.

## Local stability (optional but recommended)
- [x] Add `ca-certificates` to containers.
- [x] Allow skipping S3 health check in local dev (`S3_HEALTHCHECK_REQUIRED=false`).
- [ ] Re-test ingestion from the dashboard after rebuild.

## Optional: HTTPS on localhost
- [ ] Add a local TLS proxy (Caddy/Nginx) if you need `https://localhost`.

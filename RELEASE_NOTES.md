# CyThan AI — Production Reliability Release

This release includes the remaining production-hardening work from the current
CyThan AI roadmap, while preserving the previously requested exclusions for
phases 8 and 12.

## Backend
- Render root endpoint (`/`) returns service information instead of 404.
- `/health`, `/api/status`, `/api/metrics`, and `/api/chat` remain available.
- Privacy-conscious aggregate metrics.
- Gemini first-token latency tracking uses only requests that actually produce
  a first token.
- Streaming responses explicitly disable intermediary buffering/caching.
- Client-disconnected streams are handled without attempting to write a fake
  error payload.
- Gemini quota/network/other errors remain separated.
- Request size, rate limiting, CORS, trusted hosts, and security headers remain
  enabled.
- Production environment loading continues to rely on host-provided secrets.

## Frontend
- Chat requests use `no-store` caching and explicitly request text streaming.
- Gateway/server failure statuses are surfaced through the existing service
  status system.

## Validation
Run:
    python -m compileall main.py
and, if pytest is installed:
    pytest -q tests

The metrics endpoint is process-local and resets after a Render restart.

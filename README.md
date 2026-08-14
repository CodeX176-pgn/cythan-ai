# CyThan AI

CyThan AI is a web-based AI assistant with a modular JavaScript frontend and a FastAPI + Google Gemini backend.

## Production architecture

- **Frontend:** GitHub Pages (`docs/`)
- **Backend:** Render (`main.py`)
- **AI:** Google Gemini API
- **Frontend API:** `https://cythan-ai.onrender.com/api/chat`
- **Status API:** `https://cythan-ai.onrender.com/api/status`

## Environment variables

The backend requires `GEMINI_API_KEY`.

For local development, copy `.env.example` to `.env` and add your key. Never commit `.env` or a real API key.

Production deployments should provide secrets through the hosting provider's environment-variable system.

Optional variables:

- `ENVIRONMENT` — use `development` for local `.env` loading; production defaults to secure environment-only secret loading.
- `ALLOWED_ORIGINS` — comma-separated CORS origins.
- `ALLOWED_HOSTS` — comma-separated trusted hostnames.
- `ENABLE_API_DOCS` — set to `true` only when interactive FastAPI docs are needed.

## Security hardening

The backend includes:

- Restricted CORS methods, headers, and origins
- Trusted-host validation
- Security response headers and HSTS
- Content-Security-Policy for API responses
- Request body size protection
- Pydantic request validation and message/history limits
- Per-client rate limiting
- Gemini quota cooldown handling
- No frontend/API static hosting from the backend
- Production API documentation disabled by default
- Server-side Gemini API key handling

The frontend includes a Content-Security-Policy, production-only API endpoints, safer Markdown HTML sanitization, and a versioned service-worker cache.

## Local development

Install the Python dependencies used by the backend, set `GEMINI_API_KEY`, and run FastAPI with Uvicorn. The frontend in `docs/` can be served by a local static server.

Do not expose a Gemini API key in frontend JavaScript.

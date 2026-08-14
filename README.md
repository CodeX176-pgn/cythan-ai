# CyThan AI

CyThan AI is a production-deployed AI chat application with a modular vanilla-JavaScript frontend and a FastAPI backend powered by Google Gemini.

## Architecture

```text
GitHub Pages frontend
        |
        | HTTPS / CORS
        v
Render FastAPI backend
        |
        | Google GenAI API
        v
Google Gemini
```

The frontend is hosted on GitHub Pages and the backend is hosted on Render.

## Features

- Streaming AI responses
- Persistent chat history in the browser
- Markdown rendering and code highlighting
- Copy and regenerate controls
- Responsive/mobile UI
- Dark/light themes
- Lucide icons
- PWA support
- Gemini quota detection and cooldown handling
- Per-client in-memory request limits
- Production security headers
- CORS and trusted-host protection
- Health and AI-status endpoints
- Privacy-conscious operational metrics

## Production endpoints

- `GET /health` — Render/service health check
- `GET /api/status` — current Gemini availability
- `POST /api/chat` — streaming chat endpoint
- `GET /api/metrics` — aggregate operational metrics

Interactive FastAPI documentation is disabled in production unless `ENABLE_API_DOCS=true` is explicitly configured.

## Monitoring

Phase 9 adds in-memory operational metrics. The metrics intentionally exclude:

- chat messages
- conversation history
- API keys
- client IP addresses
- cookies
- request bodies

The metrics include aggregate request counts, HTTP status classes, chat outcomes, Gemini outcomes, uptime, and time-to-first-token latency.

Metrics reset whenever the Render process restarts. This is intentional for the lightweight deployment. If CyThan AI later uses multiple backend instances, move these counters to a shared monitoring system.

## Environment variables

Production should provide secrets through the hosting provider rather than a `.env` file.

Required:

```text
GEMINI_API_KEY
```

Optional:

```text
ENVIRONMENT=production
ALLOWED_HOSTS=cythan-ai.onrender.com
ALLOWED_ORIGINS=https://codex176-pgn.github.io
ENABLE_API_DOCS=false
```

See `.env.example` for a local-development template.

## Local development

Run the FastAPI application with Uvicorn using the project's configured Python environment.

Set:

```text
ENVIRONMENT=development
GEMINI_API_KEY=your_key
```

Then start the backend and open the GitHub Pages-style frontend through a local web server.

## Git hygiene

Backup files are intentionally ignored by Git so they can remain on a developer's machine without being deployed:

```text
*-backup.*
*.bak
*.backup
```

Secrets, virtual environments, caches, logs, and local databases are also ignored.

## Deployment

The production backend is deployed on Render and the frontend is deployed through GitHub Pages.

After a deployment, verify:

1. `/health` returns HTTP 200.
2. `/api/status` returns HTTP 200.
3. A browser CORS preflight to `/api/chat` returns HTTP 200.
4. `POST /api/chat` returns HTTP 200 and streams a Gemini response.
5. `/api/metrics` returns aggregate metrics.
6. No API key is present in frontend source or browser requests.

## Release checklist

- [ ] Frontend loads from GitHub Pages
- [ ] Render health check is green
- [ ] Gemini response streaming works
- [ ] CORS works from the production frontend
- [ ] Rate limiting works
- [ ] AI cooldown handling works
- [ ] Service-status indicator works
- [ ] PWA/service worker registers
- [ ] No secrets are committed
- [ ] Backup files are ignored
- [ ] Browser console has no production errors

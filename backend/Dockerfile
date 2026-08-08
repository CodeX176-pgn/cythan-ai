# ================================================================
# CyThan AI Backend
# Production Docker image using uv
# ================================================================

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Prevent Python from creating .pyc files
ENV PYTHONDONTWRITEBYTECODE=1

# Make Python output appear immediately in container logs
ENV PYTHONUNBUFFERED=1

# Don't create a separate uv cache that persists unnecessarily
ENV UV_COMPILE_BYTECODE=1

# Install dependencies into the project virtual environment
ENV UV_LINK_MODE=copy

WORKDIR /app


# ----------------------------------------------------------------
# Dependency files
# ----------------------------------------------------------------

COPY pyproject.toml uv.lock ./

# Install dependencies without installing the project itself.
# --frozen ensures uv.lock is respected exactly.
# --no-dev excludes development dependencies.
RUN uv sync --frozen --no-dev


# ----------------------------------------------------------------
# Application
# ----------------------------------------------------------------

COPY main.py ./


# ----------------------------------------------------------------
# Runtime
# ----------------------------------------------------------------

# Render commonly uses 10000.
# Railway supplies its own PORT environment variable.
EXPOSE 10000


# Bind to 0.0.0.0 so cloud platforms can reach the application.
CMD ["sh", "-c", "uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
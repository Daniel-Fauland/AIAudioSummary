# Multi-stage Dockerfile for the FastAPI backend
# Stage 1: Build dependencies (with build tools)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable bytecode compilation for faster startup
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install dependencies using the lockfile (without project source for better caching)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

# Copy source and install the project
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# Stage 2: Runtime image (slim, no build tools)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime

WORKDIR /app

# Copy source and the virtual environment from the builder stage
COPY . /app
COPY --from=builder /app/.venv /app/.venv

# Place the venv executables at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

# Default to production (disables uvicorn hot-reload)
ENV ENVIRONMENT=production

ENTRYPOINT []

EXPOSE 8080

CMD ["uv", "run", "main.py"]

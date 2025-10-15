# Build stage with uv for fast dependency installation
FROM python:3.11-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy dependency files first (for better caching)
COPY pyproject.toml uv.lock ./
COPY packages/commonforms-core/pyproject.toml packages/commonforms-core/
COPY apps/inference-api/pyproject.toml apps/inference-api/

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy source code and models
COPY packages packages
COPY apps/inference-api apps/inference-api

# Runtime stage
FROM python:3.11-slim

# Install runtime dependencies for PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libjpeg62-turbo \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/packages packages
COPY --from=builder /app/apps apps

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:${PATH}"
ENV PYTHONPATH="/app"

# Railway provides PORT env var
EXPOSE ${PORT:-8000}

# Use Railway's PORT variable
CMD uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --app-dir apps/inference-api \
    --workers 1

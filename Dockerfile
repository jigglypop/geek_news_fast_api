FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    libx11-xcb1 \
    libxcb1 \
    libcairo2 \
    libpango-1.0-0 \
    && rm -rf /var/lib/apt/lists/*
FROM base AS dependencies
RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN uv pip install --system --no-cache-dir -r requirements.txt && \
    uv pip install --system --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN playwright install-deps chromium
FROM dependencies AS production
RUN groupadd -r appuser && useradd -r -g appuser -d /home/appuser -m appuser
RUN mkdir -p /app/.cache && chown -R appuser:appuser /app/.cache
RUN mkdir -p /home/appuser/.cache && chown -R appuser:appuser /home/appuser
ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
ENV TOKENIZERS_PARALLELISM=false
COPY --chown=appuser:appuser . .
RUN mkdir -p output/images && chown -R appuser:appuser output
USER appuser
RUN playwright install chromium
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
# ── Stage 1: dependency install ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# gcc is needed by a small number of pip packages that compile C extensions.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Non-root user for defence-in-depth.
RUN useradd --no-create-home --shell /usr/sbin/nologin --uid 1001 app

WORKDIR /app

# Copy installed packages and executables (uvicorn, alembic, …) from builder.
COPY --from=builder /install /usr/local

# Application source only — no tests, no scripts, no dev tooling.
COPY app/     app/
COPY alembic/ alembic/
COPY alembic.ini alembic.ini

USER 1001

EXPOSE 8000

# uvicorn flags:
#   --proxy-headers          honour X-Forwarded-Proto / X-Forwarded-For from Fly edge
#   --forwarded-allow-ips *  trust any IP for forwarded headers (safe: internal_port
#                            is never exposed directly to the internet on Fly.io)
#   --no-access-log          structlog middleware already logs every request
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*", \
     "--no-access-log"]

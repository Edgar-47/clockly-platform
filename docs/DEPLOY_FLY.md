# ClockLy — Fly.io Production Deployment Guide

> **Infrastructure summary**
> | Component | Service |
> |-----------|---------|
> | Backend API | Fly.io app `clockly-api` → `api.clockly.es` |
> | Frontend | Fly.io app `clockly-app` → `app.clockly.es` |
> | Database | Neon PostgreSQL (eu-west-2) |
> | Redis | Upstash Redis (`rediss://`) |
> | File storage | Cloudflare R2 (`clockly-prod-uploads`) |
> | Email | Resend (`notify.clockly.es`) |

---

## 1. Summary of Changes Made

| File | Action | Reason |
|------|--------|--------|
| `backend_v2/.env.example` | Sanitized | Had real credentials committed to git |
| `backend_v2/app/core/config.py` | Added `db_pool_size`, `db_max_overflow`, `db_pool_recycle` | Pool was hardcoded at 20+40; would exhaust Neon connections |
| `backend_v2/app/db/session.py` | Uses pool settings from config | Same as above |
| `backend_v2/requirements.txt` | Created (prod-only deps) | Dockerfile needs a clean requirements file |
| `backend_v2/Dockerfile` | Created | Multi-stage production image |
| `backend_v2/.dockerignore` | Created | Exclude tests, secrets, artefacts from image |
| `backend_v2/fly.toml` | Created | Fly app configuration |
| `frontend-next/next.config.ts` | Added `API_URL_INTERNAL` | Proxy to Fly internal network (no TLS overhead) |
| `frontend-next/app/api/health/route.ts` | Created | Fly health checks need a 200 response; `/` redirects |
| `frontend-next/Dockerfile` | Created | Next.js standalone multi-stage image |
| `frontend-next/.dockerignore` | Created | Exclude node_modules, secrets, artefacts |
| `frontend-next/fly.toml` | Created | Fly app configuration |

---

## 2. Prerequisites

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Authenticate
fly auth login

# Verify
fly version
```

---

## 3. Backend Deployment

### 3.1 Create the Fly app (first time only)

```bash
cd backend_v2

# Create without deploying yet
fly apps create clockly-api --org personal
```

### 3.2 Set all secrets

Secrets are injected at runtime and never appear in logs or the image.

```bash
# Database (Neon)
# Recommended: use the Neon pooler endpoint for production:
#   ep-xxx-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
fly secrets set \
  DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" \
  --app clockly-api

# App secret key — generate one:
#   python -c "import secrets; print(secrets.token_urlsafe(64))"
fly secrets set \
  CLOCKLY_SECRET_KEY="<64-char-random-string>" \
  --app clockly-api

# Upstash Redis (note: rediss:// with double s for TLS)
fly secrets set \
  CLOCKLY_REDIS_URL="rediss://default:PASSWORD@HOST:PORT" \
  --app clockly-api

# Cloudflare R2
fly secrets set \
  CLOCKLY_S3_ENDPOINT_URL="https://<ACCOUNT_ID>.r2.cloudflarestorage.com" \
  CLOCKLY_S3_ACCESS_KEY_ID="<R2-access-key-id>" \
  CLOCKLY_S3_SECRET_ACCESS_KEY="<R2-secret-access-key>" \
  --app clockly-api

# Resend email
fly secrets set \
  CLOCKLY_EMAIL_RESEND_API_KEY="re_<your-key>" \
  --app clockly-api

# Stripe billing
fly secrets set \
  STRIPE_SECRET_KEY="sk_live_<key>" \
  STRIPE_WEBHOOK_SECRET="whsec_<secret>" \
  STRIPE_PRICE_PRO="price_<id>" \
  STRIPE_PRICE_BUSINESS="price_<id>" \
  --app clockly-api

# Optional: Sentry
fly secrets set \
  SENTRY_DSN="https://xxx@yyy.ingest.sentry.io/zzz" \
  --app clockly-api
```

### 3.3 Run database migrations (before first deploy)

Migrations run against the live database. Run them BEFORE deploying the new app
version to avoid downtime or schema mismatches.

```bash
# Option A — from your local machine (requires DATABASE_URL in your environment)
cd backend_v2
DATABASE_URL="postgresql://..." python -m alembic upgrade head

# Option B — after deploying, ssh into the running machine
fly ssh console --app clockly-api
# Inside the machine:
cd /app && python -m alembic upgrade head
exit
```

> **Neon note:** If using the direct (non-pooler) endpoint, alembic uses
> `NullPool` internally (see `alembic/env.py`) so it won't compete with the app pool.

### 3.4 Deploy backend

```bash
cd backend_v2
fly deploy --app clockly-api
```

Fly will:
1. Build the multi-stage Docker image
2. Push to Fly's registry
3. Roll over to the new machine
4. Health-check `GET /health` with a 20 s grace period

### 3.5 Verify backend

```bash
# Check machine status
fly status --app clockly-api

# Tail logs
fly logs --app clockly-api

# Smoke test
curl https://clockly-api.fly.dev/health
# Expected: {"status":"ok"}

# Check Fly hostname (before custom domain)
curl -H "Host: api.clockly.es" https://clockly-api.fly.dev/health
```

---

## 4. Frontend Deployment

### 4.1 Create the Fly app (first time only)

```bash
cd frontend-next
fly apps create clockly-app --org personal
```

### 4.2 Deploy frontend

No secrets needed for the frontend — all configuration is baked at build time
via `[build.args]` in `fly.toml`.

```bash
cd frontend-next
fly deploy --app clockly-app
```

Build args used (defined in `fly.toml`):
- `API_URL_INTERNAL=http://clockly-api.internal:8000` — proxy destination (Fly internal network)
- `NEXT_PUBLIC_API_URL=https://api.clockly.es` — baked into client bundles and CSP
- `NEXT_PUBLIC_APP_NAME=ClockLy`

### 4.3 Verify frontend

```bash
fly status --app clockly-app
fly logs --app clockly-app

curl https://clockly-app.fly.dev/api/health
# Expected: {"status":"ok"}
```

---

## 5. Custom Domains

### 5.1 Backend — api.clockly.es

```bash
fly certs add api.clockly.es --app clockly-api
fly certs show api.clockly.es --app clockly-api
```

Add the CNAME shown to your DNS provider:
```
api.clockly.es  CNAME  clockly-api.fly.dev
```

Or an A record pointing to the Fly anycast IP if your DNS doesn't support
CNAME on root. Fly handles TLS automatically via Let's Encrypt.

Verify:
```bash
fly certs check api.clockly.es --app clockly-api
curl https://api.clockly.es/health
```

### 5.2 Frontend — app.clockly.es

```bash
fly certs add app.clockly.es --app clockly-app
fly certs show app.clockly.es --app clockly-app
```

Add DNS:
```
app.clockly.es  CNAME  clockly-app.fly.dev
```

Verify:
```bash
fly certs check app.clockly.es --app clockly-app
curl https://app.clockly.es/api/health
```

---

## 6. Network Architecture

```
Browser
  │
  ├─ HTTPS ──► app.clockly.es (Fly edge)
  │               │
  │               └─ Next.js server (clockly-app)
  │                    │
  │                    ├─ /api/* rewrites ──► clockly-api.internal:8000 (Fly private network)
  │                    │                        │
  │                    │                     FastAPI (clockly-api)
  │                    │                        ├─ Neon PostgreSQL (eu-west-2)
  │                    │                        ├─ Upstash Redis
  │                    │                        └─ Cloudflare R2
  │                    │
  │                    └─ Static/RSC served directly
  │
  └─ HTTPS ──► api.clockly.es (Fly edge) ──► FastAPI (clockly-api)
               (direct API calls if needed, e.g. Stripe webhooks)
```

The Next.js proxy uses Fly's **private network** (`clockly-api.internal:8000`),
avoiding TLS overhead and public internet round-trips for server-to-server calls.
Stripe webhooks must reach `api.clockly.es` directly — configure the Stripe webhook
URL as `https://api.clockly.es/billing/webhook`.

---

## 7. Environment Variables Reference

### Backend secrets (via `fly secrets set`)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Use Neon pooler endpoint for production |
| `CLOCKLY_SECRET_KEY` | ✅ | ≥ 64 chars random; `token_urlsafe(64)` |
| `CLOCKLY_REDIS_URL` | ✅ | `rediss://` for Upstash TLS |
| `CLOCKLY_S3_ENDPOINT_URL` | ✅ | `https://<account_id>.r2.cloudflarestorage.com` |
| `CLOCKLY_S3_ACCESS_KEY_ID` | ✅ | R2 API token |
| `CLOCKLY_S3_SECRET_ACCESS_KEY` | ✅ | R2 API token |
| `CLOCKLY_EMAIL_RESEND_API_KEY` | ✅ | Resend API key |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_…` |
| `STRIPE_PRICE_PRO` | ✅ | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_BUSINESS` | ✅ | Stripe Price ID for Business plan |
| `SENTRY_DSN` | optional | Leave empty to disable Sentry |

### Backend config (in `fly.toml [env]`, already set)

| Variable | Value | Notes |
|----------|-------|-------|
| `CLOCKLY_ENV` | `production` | Activates production validators |
| `CLOCKLY_TRUSTED_HOSTS` | `api.clockly.es,clockly-api.fly.dev,clockly-api.internal` | Update if app renamed |
| `CLOCKLY_CORS_ALLOWED_ORIGINS` | `https://app.clockly.es` | Comma-separated list |
| `CLOCKLY_FRONTEND_BASE_URL` | `https://app.clockly.es` | Used in email links |
| `CLOCKLY_DB_POOL_SIZE` | `5` | Raise after enabling Neon pooler |
| `CLOCKLY_DB_MAX_OVERFLOW` | `10` | Same |

### Frontend (baked at build time via `fly.toml [build.args]`)

| Variable | Value | Notes |
|----------|-------|-------|
| `API_URL_INTERNAL` | `http://clockly-api.internal:8000` | Server-side proxy target |
| `NEXT_PUBLIC_API_URL` | `https://api.clockly.es` | Client bundles + CSP |
| `NEXT_PUBLIC_APP_NAME` | `ClockLy` | UI branding |

---

## 8. Database Connection Tuning (Neon)

| Neon Plan | Max connections | Recommended `pool_size` | Recommended `max_overflow` |
|-----------|----------------|------------------------|---------------------------|
| Free | 5 | 3 | 2 |
| Launch (direct) | 25 | 5 | 10 |
| Launch (pooler endpoint) | unlimited† | 10 | 20 |
| Scale (pooler) | unlimited† | 15 | 30 |

†Neon pooler (PgBouncer in transaction mode) allows hundreds of app connections.
Use the pooler endpoint URL: `ep-xxx-pooler.eu-west-2.aws.neon.tech`.

To raise pool settings after switching to the pooler:
```bash
fly secrets set \
  DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler.eu-west-2.aws.neon.tech/DBNAME?sslmode=require" \
  --app clockly-api

# In fly.toml [env], update:
CLOCKLY_DB_POOL_SIZE    = "10"
CLOCKLY_DB_MAX_OVERFLOW = "20"
# then redeploy:
fly deploy --app clockly-api
```

---

## 9. Migrations in Production

**Rule:** always run `alembic upgrade head` BEFORE deploying a new app version.

```bash
# From local machine with DATABASE_URL set in your shell:
cd backend_v2
DATABASE_URL="postgresql://..." python -m alembic upgrade head

# Check current revision:
DATABASE_URL="postgresql://..." python -m alembic current

# Rollback one step if needed:
DATABASE_URL="postgresql://..." python -m alembic downgrade -1
```

There is no automatic migration on startup — this is intentional. Running
migrations and deploying the app are separate steps so you can:
1. Validate the migration in staging first
2. Roll back the migration without redeploying the app

---

## 10. Post-Deploy Validation Checklist

### Backend

- [ ] `fly status --app clockly-api` → machine running
- [ ] `curl https://api.clockly.es/health` → `{"status":"ok"}`
- [ ] `fly logs --app clockly-api` → no ERROR lines at startup
- [ ] Try login from the frontend — cookie is set
- [ ] Upload an expense receipt — file appears in R2 bucket
- [ ] Invite a user — email arrives via Resend

### Frontend

- [ ] `fly status --app clockly-app` → machine running
- [ ] `curl https://app.clockly.es/api/health` → `{"status":"ok"}`
- [ ] `https://app.clockly.es` redirects to `/login` ✓
- [ ] Login works, dashboard loads
- [ ] Clock-in / clock-out works with geolocation
- [ ] `/settings` billing upgrade flow redirects to Stripe Checkout

### Security spot-check

- [ ] `curl http://app.clockly.es` → 301 redirect to HTTPS
- [ ] `curl https://api.clockly.es/docs` → 404 (docs disabled in production)
- [ ] Response has `Strict-Transport-Security` header
- [ ] Response has `X-Frame-Options: DENY` header
- [ ] Stripe webhook URL configured as `https://api.clockly.es/billing/webhook`

---

## 11. Scaling

```bash
# Scale to 2 machines (zero-downtime rolling deploy)
fly scale count 2 --app clockly-api

# Resize VM
fly scale vm shared-cpu-2x --app clockly-api

# Check current scale
fly scale show --app clockly-api
```

When scaling to 2+ machines, update `CLOCKLY_DB_POOL_SIZE` accordingly:
- Each machine opens `pool_size + max_overflow` connections at peak
- 2 machines × (5 + 10) = 30 connections — verify against your Neon plan

---

## 12. Known Risks and Pending Items

| Risk | Severity | Action |
|------|----------|--------|
| `.env.example` had real credentials committed — rotate all of them | 🔴 | Rotate Neon password, R2 keys, Resend API key, and generate a new `CLOCKLY_SECRET_KEY` immediately |
| Neon connection limit with multiple Fly machines | 🟠 | Switch to Neon pooler endpoint before scaling past 1 machine |
| `psycopg[binary]` requires glibc — verify on first `fly deploy` | 🟡 | If build fails, add `libpq-dev` to Dockerfile apt install |
| Stripe not configured (keys empty) | 🟠 | App will fail startup in production until `STRIPE_SECRET_KEY` is set |
| Cold start latency on `auto_stop_machines` | 🟡 | `min_machines_running = 1` keeps backend warm; frontend may cold-start |
| R2 CORS policy | 🟡 | If you serve presigned URLs directly to browsers, configure R2 bucket CORS to allow `https://app.clockly.es` |

---

## 13. Useful Commands

```bash
# SSH into a running machine
fly ssh console --app clockly-api

# View secrets (names only, not values)
fly secrets list --app clockly-api

# Update a single secret
fly secrets set CLOCKLY_SECRET_KEY="new-value" --app clockly-api

# Force redeploy without code change
fly deploy --app clockly-api --image-label $(date +%s)

# Check TLS certificate status
fly certs list --app clockly-api
fly certs list --app clockly-app

# Monitor live logs
fly logs --app clockly-api -f
fly logs --app clockly-app -f
```

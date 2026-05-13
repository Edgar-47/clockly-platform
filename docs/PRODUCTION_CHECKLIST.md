# ClockLy - Production Deployment Checklist

Complete before serving real traffic.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `CLOCKLY_ENV=production` | yes | Enables production-only validation and security headers. |
| `CLOCKLY_SECRET_KEY` | yes | Must not be `change-me-in-production`. Use a long random value. |
| `CLOCKLY_DATABASE_URL` or `DATABASE_URL` | yes | PostgreSQL URL. `postgres://` is normalized to `postgresql+psycopg://`. |
| `CLOCKLY_CORS_ALLOWED_ORIGINS` | yes | Comma-separated explicit frontend origins. No `*` in production. |
| `CLOCKLY_TRUSTED_HOSTS` | yes | Comma-separated hostnames. No `*` in production. |
| `NEXT_PUBLIC_API_URL` | yes | Public backend origin used by the Next.js app and CSP. |
| `CLOCKLY_RATE_LIMIT_ENABLED` | yes | Must remain `true` in production. |
| `CLOCKLY_RATE_LIMIT_BACKEND` | recommended | `memory` by default; use `redis` for multi-worker production. |
| `CLOCKLY_REDIS_URL` | when Redis backend | Required when `CLOCKLY_RATE_LIMIT_BACKEND=redis`. |
| `CLOCKLY_RATE_LIMIT_KEY_PREFIX` | optional | Defaults to `clockly:rate-limit`. |
| `CLOCKLY_STORAGE_BACKEND=r2` | yes | Production requires Cloudflare R2 for private attachments. |
| `CLOCKLY_S3_BUCKET` | yes | Private R2 bucket name. |
| `CLOCKLY_S3_ENDPOINT_URL` | yes | R2 S3-compatible endpoint URL. |
| `CLOCKLY_S3_ACCESS_KEY_ID` | yes | R2 access key ID. Do not expose to frontend. |
| `CLOCKLY_S3_SECRET_ACCESS_KEY` | yes | R2 secret key. Do not log or commit. |
| `CLOCKLY_S3_REGION` | yes | Use `auto` for Cloudflare R2 unless a deployment needs another value. |
| `CLOCKLY_EMAIL_PROVIDER` | recommended | `noop` by default; use `smtp` when transactional email is ready. |
| `CLOCKLY_EMAIL_FROM` | when email enabled | Sender address for transactional email. |
| `CLOCKLY_EMAIL_SMTP_HOST` | when SMTP | SMTP host when `CLOCKLY_EMAIL_PROVIDER=smtp`. |
| `CLOCKLY_EMAIL_SMTP_PORT` | when SMTP | Defaults to `587`. |
| `CLOCKLY_EMAIL_SMTP_USERNAME` | when SMTP auth | SMTP username. |
| `CLOCKLY_EMAIL_SMTP_PASSWORD` | when SMTP auth | SMTP password/secret. |
| `CLOCKLY_EMAIL_SMTP_USE_TLS` | when SMTP | Defaults to `true`. |

## Database

- [ ] Run `cd backend_v2 && alembic upgrade head`.
- [ ] Use managed PostgreSQL, not SQLite.
- [ ] Configure backups and test restore.
- [ ] Use a dedicated database user with least privilege.

## Backend

- [ ] Run behind HTTPS and a trusted reverse proxy.
- [ ] Run with explicit trusted hosts and CORS origins.
- [ ] Confirm `/docs` and `/redoc` are disabled in production.
- [ ] Confirm security headers are present:
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- [ ] Use Redis rate limiting or an equivalent edge/proxy limiter for multiple workers.
- [ ] Use a private Cloudflare R2 bucket for attachments and confirm the bucket
  has no public access policy.
- [ ] Set transactional email provider or accept `noop` with the operational
  fallback that invitations return an `acceptance_url`.
- [ ] Monitor `audit_logs` for failed login, permission denial, invitation, and member-management events.
- [ ] Confirm application logs are shipped to the staging/production log backend.
- [ ] Confirm `CLOCKLY_ENV=production` is set in staging-like validation.

## Frontend

- [ ] Build with `cd frontend-next && npm ci && npm run build`.
- [ ] Set `NEXT_PUBLIC_API_URL` to the production backend origin at build time.
- [ ] Verify `/kiosk` redirects unauthenticated users to `/login`.
- [ ] Verify `/accept-invitation/{token}` is reachable without a session.
- [ ] Verify superadmin users land on `/access-unavailable`, not tenant dashboard.

## CI Gates

Backend:

```powershell
cd backend_v2
$env:PYTHONPYCACHEPREFIX=(Join-Path $env:LOCALAPPDATA "Temp\\clockly-compile-cache")
New-Item -ItemType Directory -Force $env:PYTHONPYCACHEPREFIX | Out-Null
python -m compileall app tests
python -m pytest
```

Frontend:

```powershell
cd frontend-next
npm run type-check
npm run lint
npm run build
```

E2E:

```powershell
cd frontend-next
npm run test:e2e
```

For GitHub E2E, set `E2E_ENABLED=true`, optional `E2E_OWNER_EMAIL`, and the
repository secret `E2E_OWNER_PASSWORD`. When authenticated E2E is enabled, CI
fails before seeding data if the secret is missing.

Recommended E2E coverage before public staging:

- [ ] Invitation accepted creates a login and employee profile when role is `employee`.
- [ ] Employee portal can clock in/out with the linked profile.
- [ ] Kiosk requires admin session and validates PIN.
- [ ] Geolocation granted sends coordinates with clock-in/out.
- [ ] Geolocation denied still records attendance with denied status.
- [ ] Plan-gating blocks Business/Pro-only features on lower plans.

## Onboarding

- [ ] Verify public company signup through `/register-company` and
  `POST /auth/register-company` creates the company, owner user, default
  settings, and HttpOnly session cookies.
- [ ] Verify the authenticated `/onboarding` wizard can update company context,
  create the first employee, configure kiosk PIN, and handle invitations through
  backend endpoints.
- [ ] Keep `backend_v2/seed.py` limited to controlled local/demo data; do not
  use it as the production tenant provisioning path.

## Legal and Operations

- [ ] Privacy policy published.
- [ ] Punctual geolocation notice shown or included in customer onboarding.
- [ ] Attendance and geolocation retention policy defined.
- [ ] Data export process documented.
- [ ] Terms of service published.
- [ ] Consent or legal basis for geolocation documented per customer use case.

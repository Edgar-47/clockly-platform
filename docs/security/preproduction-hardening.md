# Preproduction Hardening Decisions

## E2E Auth

- Authenticated Playwright tests require `E2E_OWNER_PASSWORD`.
- Local runs without the variable skip authenticated suites.
- CI sets `E2E_AUTH_REQUIRED=true`; when `E2E_ENABLED=true`, the workflow fails
  with an explicit error if the GitHub secret is missing.
- No real password is stored in the repository.

## Redis Rate Limiting

- Local/dev defaults to `CLOCKLY_RATE_LIMIT_BACKEND=memory`.
- `CLOCKLY_RATE_LIMIT_ENABLED=false` is allowed only outside production.
- Multi-worker production should use `CLOCKLY_RATE_LIMIT_BACKEND=redis` and
  `CLOCKLY_REDIS_URL`.
- The Python `redis` client is now part of `requirements.txt`; this repo does
  not currently include a production Dockerfile or `pyproject.toml`.

## Transactional Email

- Invitation creation is the source of truth; email delivery is best-effort.
- `CLOCKLY_EMAIL_PROVIDER=noop` keeps local development dependency-free.
- `CLOCKLY_EMAIL_PROVIDER=smtp` is the first concrete provider.
- Resend, SendGrid, and Mailgun are reserved provider names for future adapters.
- A provider failure is logged and the API still returns `acceptance_url`.

## npm audit

- `npm audit --audit-level=moderate --json` currently reports 0
  vulnerabilities.
- No automatic `npm audit fix --force` was applied.
- If moderate advisories return, fix only by bounded package upgrades that do
  not force major framework changes, or document affected package, dependency
  path, impact, mitigation, and recommendation before changing the lockfile.

## Superadmin Identity

- `superadmin` is a platform/internal identity, not a tenant admin role.
- Superadmin must not enter the normal tenant dashboard.
- A future internal console should separate platform identity from tenant
  `company_id`.
- Current schema keeps `users.company_id` non-null, so existing superadmin
  accounts may carry a compatibility company. Backend permissions and frontend
  guards block tenant dashboard access until the internal console exists.

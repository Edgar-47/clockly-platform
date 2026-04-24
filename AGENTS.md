# AGENTS.md

Guidelines for automated changes in `clockly-platform`.

## Architecture Source of Truth

- Treat `backend_v2/app` as the canonical backend package.
- Treat `frontend-next` as the canonical web frontend.
- Treat `backend_v2/alembic` as the canonical database migration history.
- Treat backend-issued HttpOnly cookies plus `GET /auth/me` as the canonical
  session model.
- The current repo does not use `backend/`, `frontend/`, root `app/`, or
  `/api/v1` in the active product flow. Do not reintroduce those as if they
  were current architecture.

## Product boundaries

- Keep backend and web frontend in this repo. Do not split services during MVP
  work.
- Do not expose incomplete product surfaces as if they were production-ready.
- Hidden or retired web surfaces should stay redirected or removed until the
  backend flow is complete end-to-end.
- The kiosk is a real flow, but it must stay protected behind an authenticated
  admin session and backend PIN validation.

## Ownership rules

- Backend changes belong under `backend_v2/app` and related Alembic files.
- Frontend route, UI, and client-session changes belong under `frontend-next`.
- Database shape changes must update SQLAlchemy models, Alembic migrations when
  needed, and any affected backend schemas/services.
- Update `docs/contracts/api_v1.md` whenever backend contracts or auth/session
  behavior change.
- Update `README.md` when the real repo architecture or visible product surface
  changes.

## Safety rules

- Prefer small, reversible changes.
- Do not duplicate auth/session logic across proxy, hooks, and API client.
- Do not keep fake flows such as mock persistence or placeholder recovery
  screens visible to users.
- Do not commit `.env`, local databases, uploads, exports, caches, `.next`, or
  build output.
- Remove or isolate dead code when it is clearly disconnected from the active
  architecture.

## Validation

Before finishing backend-affecting work, run at least:

```powershell
cd backend_v2
$env:PYTHONPYCACHEPREFIX=(Join-Path $env:LOCALAPPDATA "Temp\\clockly-compile-cache")
New-Item -ItemType Directory -Force $env:PYTHONPYCACHEPREFIX | Out-Null
python -m compileall app tests
python -m pytest
```

Before finishing frontend-affecting work, run at least:

```powershell
cd frontend-next
npm run type-check
```

If PostgreSQL is unavailable, report which backend checks or tests were not run.
If Windows/OneDrive blocks writes to `__pycache__`, keep using
`PYTHONPYCACHEPREFIX` pointed at `%LOCALAPPDATA%\\Temp` instead of changing the
validation target.

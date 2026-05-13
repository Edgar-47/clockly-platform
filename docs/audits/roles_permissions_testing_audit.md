# Roles, Permissions and Testing Audit

Date: 2026-04-27

## Current State

ClockLy's active architecture is `backend_v2/app` for FastAPI, `backend_v2/alembic` for migrations, and `frontend-next` for the web app. The active API has no `/api/v1` prefix.

Authentication is issued by backend HttpOnly cookies (`clockly_access`, `clockly_refresh`) and hydrated in the frontend with `GET /auth/me`.

## Stabilized Areas

- Frontend TypeScript and ESLint now pass with Next.js flat ESLint config.
- Member/invitation management is available in `/settings` for roles with `users:manage`.
- Public invitation acceptance exists at `/accept-invitation/{token}` and calls `POST /invitations/{token}/accept`.
- `/kiosk` is protected by session and tenant admin/manager role guard.
- `superadmin` is reserved for future internal console work and is not treated as a tenant admin in frontend or backend permissions.
- CI E2E seed uses `backend_v2/seed.py` from the correct working directory.
- Audit logging writes sensitive events to `audit_logs`.
- Rate limiting is encapsulated behind a store strategy and can be moved to Redis without rewriting route code.
- Production security headers are configured in backend and frontend.

## Remaining Risks

- Invitation email delivery is still out of scope; the UI displays the returned acceptance URL after creation.
- Redis rate limiting requires adding the optional `redis` Python package to the production image when `CLOCKLY_RATE_LIMIT_BACKEND=redis`.
- Playwright authenticated tests require seeded credentials via `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD`.
- `superadmin` is still stored in the `users` table with a `company_id`; isolation is permission-enforced until a separate internal identity model exists.

## Tests

Backend:

- `test_invitations.py` covers invitation lifecycle, revocation, role changes, last-owner protection, and cross-tenant behavior.
- `test_audit_log.py` covers failed-login and invitation-created audit entries.
- `test_permissions.py` and `test_security.py` cover tenant permission boundaries and superadmin isolation.

Frontend E2E:

- `role-restrictions.spec.ts` asserts unauthenticated protected routes redirect to login, including `/kiosk`.
- `kiosk.spec.ts` asserts owner access to protected kiosk when E2E credentials are present.

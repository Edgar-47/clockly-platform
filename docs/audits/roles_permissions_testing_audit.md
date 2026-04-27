# Roles, Permissions and Testing Audit

Date: 2026-04-27

## Current State

ClockLy's active architecture is `backend_v2/app` for the FastAPI backend,
`backend_v2/alembic` for migrations, and `frontend-next` for the web app. The
active API has no `/api/v1` prefix.

Authentication is issued by the backend through HttpOnly cookies
`clockly_access` and `clockly_refresh`; protected endpoints also accept Bearer
tokens. The frontend treats `GET /auth/me` as session truth and refreshes once
through `POST /auth/refresh` after a `401`.

Roles already exist in `UserRole`: `employee`, `manager`, `admin`, `owner`,
and `superadmin`. Permissions are centralized in
`backend_v2/app/services/permissions.py` and enforced through FastAPI
dependencies in `backend_v2/app/dependencies/auth.py`.

Tenant scoping is mostly implemented by passing `ctx.company_id` into
repositories and services. Core company-owned repositories filter by
`company_id`.

There is no real invitation lifecycle. Admin/owner user creation currently
uses `POST /users` with an initial password, which creates an account
immediately instead of sending a tokenized invite.

The frontend has route guards in `frontend-next/proxy.ts` and role guards in
`frontend-next/hooks/use-auth.ts`. Admin routes allow `superadmin`, `owner`,
`admin`, and `manager`; employee routes allow only `employee`.

Backend tests already cover auth, permissions, tenancy, attendance, employees,
plans, and basic password hashing. Frontend E2E uses Playwright, but several
authenticated tests are skipped unless environment credentials are provided.

## Existing Roles

- `employee`: can read/write own attendance and own tickets.
- `manager`: can read employees, schedules, attendance, metrics, tickets, and
  locations; can manage attendance and tickets; cannot manage users.
- `admin`: can manage employees, schedules, attendance, metrics, tickets,
  exports, locations, and users within the company.
- `owner`: same current permissions as admin, but `UserService` permits owner
  to assign `admin`, `manager`, and `employee`.
- `superadmin`: has `superadmin:access` and broad tenant permissions, but still
  belongs to a `company_id` because the current `users` table requires one.

## Critical Endpoints

- Auth/session: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`,
  `POST /auth/logout`.
- User management: `GET /users`, `GET /users/{user_id}`, `POST /users`,
  `PATCH /users/{user_id}/role`, `PATCH /users/{user_id}/activate`,
  `PATCH /users/{user_id}/deactivate`.
- Employee lifecycle: `GET /employees`, `GET /employees/{employee_id}`,
  `POST /employees`, `PATCH /employees/{employee_id}`.
- Attendance and kiosk: `GET /attendance/sessions`,
  `POST /attendance/clock-in`, `POST /attendance/clock-out`.
- Sensitive reporting/exporting: `GET /metrics/overview`,
  `GET /exports/attendance`.
- Tenant modules: `GET/POST /tickets`, `GET/POST /locations`,
  `GET/POST/PATCH /schedules`.
- Internal: `GET /superadmin/status`.
- Public plan catalog: `GET /plans`; authenticated company plan:
  `GET /plans/current`.

## Risks Detected

1. No invitation model or tokenized invite flow exists. Admins create users
   directly with passwords, which is not acceptable for a sellable SaaS.
2. `User.company_id` is non-null, so `superadmin` is not fully isolated from
   tenant context. The public APIs block assignment of `superadmin`, but the
   data model still couples superadmin to a company.
3. `/users` exposes direct user creation alongside role mutation. It enforces
   many rules in `UserService`, but it does not implement invitation states,
   token expiration, revocation, or accepted/reused-token controls.
4. Last-owner protection is incomplete. Owners cannot be modified by
   non-superadmins, but the code does not yet enforce "do not remove or demote
   the last owner" for tenant member management.
5. Frontend role hiding is incomplete for future member management because
   there is no members/invitations UI yet.
6. E2E coverage exists but is not stable as a release gate: authenticated flows
   are skipped without seeded credentials. Existing `role-restrictions.spec.ts`
   still describes kiosk as public even though the repo contract says kiosk
   requires an authenticated admin session.
7. CI exists, but backend lint/format scripts are not defined. Frontend lint is
   configured as `next lint`, which may be incompatible with newer Next
   versions if not verified.
8. The permissions matrix in `docs/permissions.md` is resource-level, not
   endpoint-by-endpoint, and it does not include invitations because they do not
   exist yet.
9. Audit log models exist, but security-sensitive actions such as role changes,
   account creation, invitations, and revocation are not written to audit logs.

## Security Gaps

- Missing persisted invitations with hashed tokens.
- Missing accept-invitation flow that creates or links users safely.
- Missing invitation revocation endpoint.
- Missing explicit member management endpoints under business/company scope.
- Missing last-owner invariant in the new member lifecycle.
- Missing endpoint-by-endpoint documentation for permissions and test status.
- Missing stable E2E path for login, employee lifecycle, kiosk, and logout.
- Missing backend lint/check command.
- Superadmin isolation is policy-enforced but not data-model isolated.

## Implementation Plan

1. Add a `UserInvitation` model, Alembic migration, schemas, repository, and
   service. Store only `token_hash`; return the raw token only at creation time
   for development/testing until email delivery exists.
2. Add tenant-scoped endpoints:
   - `POST /businesses/{id}/invitations`
   - `GET /businesses/{id}/invitations`
   - `DELETE` or revoke equivalent for pending invitations
   - `POST /invitations/{token}/accept`
   - `POST /businesses/{id}/members/{user_id}/role`
   - `DELETE /businesses/{id}/members/{user_id}`
3. Reuse and strengthen role rules from `UserService`: no tenant-created
   `superadmin`, no admin-created `owner/admin`, no self role escalation, no
   cross-tenant mutation, and no last-owner removal/demotion.
4. Keep `/users` behavior stable for existing tests, but route new production
   member management through invitations and business member endpoints.
5. Add frontend service/hooks/types for invitations and member management.
   Add a members screen under settings or a dedicated admin route, with
   loading/error/empty/success states and role-aware controls.
6. Create `docs/security/permissions_matrix.md` endpoint by endpoint after
   routes are implemented.
7. Expand backend tests around invitations, member role changes/revocation,
   last-owner protection, and cross-tenant failures.
8. Update Playwright E2E to match the real protected kiosk behavior and add
   stable tests for logout/back-button protection where feasible.
9. Update CI and documentation with the real commands and any known limitations.


# ClockLy API Contract

This filename is historical. The active API does not use `/api/v1`.

Base URL local: `http://127.0.0.1:8010`

## Architecture Source of Truth

- `backend_v2/app` serves the active REST API.
- `frontend-next` is the only web client in the current product flow.
- Session truth lives in backend-issued HttpOnly cookies plus `GET /auth/me`.
- The frontend does not persist auth tokens in `localStorage`.

## Auth and session

### Session strategy

- `POST /auth/login` returns a token payload and sets:
  - `clockly_access`
  - `clockly_refresh`
- `GET /auth/me` is the authoritative current-user endpoint.
- `POST /auth/refresh` may use the refresh cookie or an explicit
  `refresh_token` in the request body.
- `POST /auth/logout` revokes the refresh token when present and clears both
  cookies.
- Protected backend endpoints accept:
  - `Authorization: Bearer <token>`
  - or the `clockly_access` cookie

### POST `/auth/login`

Request:

```json
{
  "identifier": "owner@clockly.local",
  "password": "Admin12345"
}
```

Notes:

- `identifier` is the field currently used by the web frontend.
- The backend also accepts `email` and normalizes either field into the same
  login identifier.

Response:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": "uuid",
    "company_id": "uuid",
    "email": "owner@clockly.local",
    "full_name": "ClockLy Owner",
    "role": "owner",
    "is_active": true,
    "last_login_at": null,
    "created_at": "2026-04-23T09:00:00Z"
  },
  "company": {
    "id": "uuid",
    "name": "ClockLy Demo",
    "slug": "clockly-demo",
    "timezone": "Europe/Madrid",
    "plan_type": "pro",
    "plan_name": "Pro",
    "max_employees": 30,
    "has_exports": true,
    "has_advanced_filters": true,
    "has_multi_location": false,
    "has_geolocation": true,
    "has_admin_reports": true,
    "has_support": true,
    "trial_ends_at": null,
    "is_active_subscription": true,
    "is_beta_user": false,
    "stripe_subscription_status": "active",
    "created_by": "uuid"
  },
  "permissions": [
    "attendance:read",
    "attendance:write"
  ]
}
```

### POST `/auth/register-company`

Public endpoint used by `/register-company`.

Request:

```json
{
  "company_name": "Acme Clinic",
  "owner_email": "owner@acme.example",
  "owner_full_name": "Acme Owner",
  "password": "strong-password",
  "timezone": "Europe/Madrid",
  "plan_type": "pro"
}
```

Creates `Company`, owner `User`, plan-derived company fields, and
`company_settings` for onboarding. The response is the same session payload as
login and sets `clockly_access` and `clockly_refresh`.

Duplicate owner email or duplicate company slug returns `409`.

### POST `/auth/refresh`

Optional request body:

```json
{
  "refresh_token": "..."
}
```

Normal flow in the web app: the backend reads the refresh token from the
HttpOnly cookie and rotates the session.

### GET `/auth/me`

Returns the authenticated user, active company context, plan-derived company
capabilities, and permission list.

### POST `/auth/logout`

Response:

```json
{
  "ok": true
}
```

### POST `/auth/request-password-reset`

Public endpoint used by `/forgot-password`.

Request:

```json
{
  "email": "owner@acme.example"
}
```

Always returns the same success shape, whether or not the email exists. When an
active user exists, the backend creates a hashed, expiring token and sends a
transactional email containing `/reset-password/{token}`.

### POST `/auth/reset-password`

Public endpoint used by `/reset-password/{token}`.

Request:

```json
{
  "token": "...",
  "password": "new-strong-password"
}
```

Valid tokens change the user password, mark the token used, and revoke active
refresh tokens for that user. Used or expired tokens return `409`; unknown
tokens return `404`.

## Onboarding

Visible in the current web UI under `/onboarding` after public company
registration:

- `GET /onboarding/status`
- `PUT /onboarding/company`
- `POST /onboarding/first-employee`
- `POST /onboarding/kiosk-pin`
- `POST /onboarding/invitations`
- `POST /onboarding/invitations/skip`
- `POST /onboarding/complete`

All onboarding endpoints require an authenticated owner/admin session
(`users:manage`). Completion requires at least one active employee and at least
one kiosk PIN configured on an employee.

## Members and invitations

Visible in the current web UI under `/settings`:

- `GET /businesses/{business_id}/members`
- `POST /businesses/{business_id}/invitations`
- `GET /businesses/{business_id}/invitations`
- `DELETE /businesses/{business_id}/invitations/{invitation_id}`
- `POST /businesses/{business_id}/members/{user_id}/role`
- `DELETE /businesses/{business_id}/members/{user_id}`
- `GET /invitations/{token}`
- `POST /invitations/accept`
- `POST /invitations/{token}/accept`

Tenant member management requires `users:manage`, currently granted to `owner`
and `admin`. `superadmin` is not a tenant admin role. `hr_manager` can create
employee login accounts through `/users` but cannot invite members, change
roles, deactivate accounts, or access tenant settings/billing.

### POST `/businesses/{business_id}/invitations`

Request:

```json
{
  "email": "new-user@example.com",
  "role": "manager"
}
```

Rules:

- `owner` may invite `admin`, `hr_manager`, `manager`, and `employee`.
- `admin` may invite `hr_manager`, `manager`, and `employee`.
- `owner` and `superadmin` cannot be invited through tenant member management.
- Duplicate pending invitations for the same company/email return `409`.

Response includes the invitation fields plus a one-time `acceptance_url`. The
raw token is not stored server-side; only `token_hash` is persisted.

When transactional email is configured, the backend attempts to send the same
acceptance URL by email after creating the invitation. Email delivery failures
are logged and do not roll back invitation creation; the response still returns
`acceptance_url` for manual fallback. Provider errors and token hashes are not
included in the API response.

Invitation states: `pending`, `accepted`, `expired`, `revoked`.

### POST `/invitations/{token}/accept`

Public endpoint used by `/accept-invitation/{token}`.

The same acceptance flow is also available as `POST /invitations/accept` with
the token in the request body, which is the preferred web client path.

Request:

```json
{
  "full_name": "New User",
  "password": "strong-password"
}
```

Successful acceptance creates the user, marks the invitation `accepted`, and
returns the invitation. The endpoint does not create a login session; the web
flow sends the user to `/login`.

For invitations with role `employee`, acceptance also creates or links an
`Employee` profile in the invited company:

- If an active or inactive employee already exists in the same company with the
  same email and no linked user, the backend links it to the new user and
  ensures it is active.
- If no employee exists, the backend creates one from the accepted full name
  and invitation email.
- If the email is already registered as a `User`, acceptance returns `409`.
- If the matching employee email is already linked to another user, acceptance
  returns `409` to avoid duplicate or ambiguous employee profiles.
- Expired invitations become `expired` and return `409`; invalid tokens return
  `404`.

## Plans

Visible in the current web UI (`/settings`):

- `GET /plans`
- `GET /plans/current`

Plans expose company capabilities such as:

- `has_exports`
- `has_advanced_filters`
- `has_multi_location`
- `has_geolocation`
- `has_admin_reports`
- `has_support`

## Billing

Stripe Billing is the active monetization path:

- `POST /billing/checkout`
- `POST /billing/portal`
- `POST /billing/webhook`

`POST /billing/checkout` requires `users:manage` and creates a Stripe Checkout
Session in subscription mode for `pro` or `business`.

Request:

```json
{
  "plan_type": "pro"
}
```

Response:

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

`POST /billing/portal` creates a Stripe Customer Portal session for the active
tenant customer.

The webhook accepts Stripe events and updates tenant billing state. Supported
events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Subscription create/update maps Stripe Price IDs back to `PlanType` and syncs
plan-derived tenant capabilities. Subscription deletion moves the tenant back
to Free and marks the subscription inactive.

## Settings

Visible in the current web UI under `/settings` for `owner` and `admin`:

- `GET /settings/auto-clock-out`
- `PUT /settings/auto-clock-out`

Requires `settings:read` to view and `settings:write` to modify. The
`hr_manager`, `manager`, and `employee` roles receive `403`.

Request:

```json
{
  "auto_clock_out_enabled": true,
  "auto_clock_out_time": "23:30",
  "auto_clock_out_timezone": "Europe/Madrid",
  "auto_clock_out_grace_minutes": 0
}
```

Validation:

- Enabling requires `auto_clock_out_time`.
- Timezone must be a valid IANA timezone.
- The backend stores `auto_clock_out_updated_by_user_id` and
  `auto_clock_out_updated_at`.

## Employees

Visible in the current web UI (`/employees`):

- `GET /employees`
- `GET /employees/{employee_id}`
- `POST /employees`
- `PATCH /employees/{employee_id}`
- `POST /employees/{employee_id}/pin`
- `POST /employees/me/pin`

Contract notes:

- `GET /employees` supports `include_inactive`, `limit`, and `offset`.
- `EmployeeRead` includes `has_pin` so the frontend can decide kiosk
  availability without exposing PIN material.
- Employee creation can include login credentials and a 4-digit kiosk PIN.
- Employee updates accept `hired_on`, so the web field "Fecha de alta"
  persists through `PATCH /employees/{employee_id}`.
- Admins can reset or clear kiosk PINs with `POST /employees/{employee_id}/pin`.
- Employees can change their own PIN with `POST /employees/me/pin`.

## Attendance

Visible in the current web UI (`/sessions`, `/employee`, `/kiosk`):

- `GET /attendance/sessions`
- `POST /attendance/clock-in`
- `POST /attendance/clock-out`
- `PATCH /attendance/sessions/{session_id}`
- `POST /attendance/sessions/bulk/auto-close`
- `POST /attendance/sessions/bulk/auto-clock-out`

### GET `/attendance/sessions`

Query params:

- `employee_id`
- `status`
- `date_from`
- `date_to`
- `clock_out_source` (`employee`, `admin`, `manual`, `auto`)

Notes:

- Employee users are automatically scoped to their own sessions.
- Advanced filters require `has_advanced_filters`.
- Datetime responses are serialized in the tenant company timezone. The backend
  stores all timestamps in UTC.

### POST `/attendance/clock-in`

Request:

```json
{
  "employee_id": "uuid",
  "method": "kiosk",
  "pin": "1234",
  "notes": "optional",
  "auto_close_open_session": false,
  "latitude": 41.3851,
  "longitude": 2.1734,
  "accuracy_meters": 15,
  "location_source": "browser",
  "location_permission_status": "granted"
}
```

### POST `/attendance/clock-out`

Request:

```json
{
  "employee_id": "uuid",
  "session_id": "uuid",
  "method": "kiosk",
  "pin": "1234",
  "notes": "optional",
  "latitude": 41.3851,
  "longitude": 2.1734,
  "accuracy_meters": 15,
  "location_source": "browser",
  "location_permission_status": "granted"
}
```

### PATCH `/attendance/sessions/{session_id}`

Admin correction endpoint. It validates tenant ownership, prevents overlapping
sessions, recalculates duration, and marks the session corrected.

Request:

```json
{
  "clock_in": "2026-04-28T09:00:00",
  "clock_out": "2026-04-28T17:30:00",
  "notes": "Correccion validada por administracion",
  "mark_corrected": true
}
```

Naive datetimes are interpreted in the tenant company timezone before storing
UTC.

### POST `/attendance/sessions/bulk/auto-close`

Admin endpoint for optional automatic closure of stale open sessions.

Request:

```json
{
  "older_than_hours": 16,
  "notes": "Cierre automatico de fin de jornada"
}
```

Response includes `closed_count` and the corrected sessions.

### POST `/attendance/sessions/bulk/auto-clock-out`

Runs the configured forgotten clock-out policy for the authenticated tenant.
This endpoint is intended for owner/admin manual execution and requires
`settings:write`; scheduled execution should use the backend job instead.

Automatic closures:

- Close only currently open `attendance_sessions`.
- Respect `company_id` and configured timezone.
- Are idempotent; already closed sessions are not changed and duplicate
  incidents are prevented by `(company_id, attendance_session_id, type)`.
- Set `clock_out_source = auto`, `auto_closed = true`,
  `has_incident = true`, `incident_type = auto_clock_out`, and
  `closed_automatically_at`.
- Create `attendance_incidents.type = auto_clock_out`.
- Record audit metadata including configured user, execution time, session,
  employee, timezone, and close timestamp.

Scheduler/job:

```powershell
cd backend_v2
python scripts/run_auto_clock_out.py
```

Run this from cron, Windows Task Scheduler, or a worker scheduler. No critical
automatic clock-out logic is coupled to the frontend.

## Salary estimates

Visible in the current web UI under `/salaries` for roles with `salary:read`.
This module is "Salarios estimados" / "Calculo estimado de pagos"; it is not
official payroll.

- `GET /salary-profiles`
- `POST /salary-profiles`
- `GET /salary-profiles/{employee_id}`
- `PATCH /salary-profiles/{profile_id}`
- `GET /salary-calculations?employee_id=&from=&to=`
- `POST /salary-calculations/generate`

Supported salary types:

- `hourly`: worked hours from closed `attendance_sessions` x hourly amount.
- `daily`: unique worked local days x daily amount.
- `shift`: closed sessions x shift amount.
- `monthly`: monthly base prorated by days in the selected range/profile
  segment.
- `weekly`: weekly base prorated by selected days / 7.

Rules:

- `attendance_sessions` is the source of truth.
- Open sessions are ignored and returned as `open_sessions_ignored`.
- Incidents are counted and surfaced in calculation metadata.
- Salary profile changes inside a period are split into line items by
  effective date.
- Profile creation automatically closes a previous open-ended profile for the
  same employee when the new profile starts later; overlapping ranges are
  rejected.
- All endpoints validate tenant ownership.

Legal warning returned by calculations:

```text
Calculo estimado basado en fichajes registrados. Revisar antes de pagar.
```

Kiosk/PIN rules:

- The web route `/kiosk` is protected. It requires an authenticated tenant
  admin/manager session before employees are displayed.
- `pin` must be exactly 4 digits when the action is performed as `kiosk` or
  `pin`.
- Admin-managed kiosk actions are validated in the backend against the
  employee PIN hash.
- Employees clocking their own web session do not need a PIN.
- Kiosk attempts are rate limited and return `429` with a clear message when
  too many PIN attempts are made.

## Exports

Visible in the current web UI when the company plan allows it:

- `GET /exports/attendance?format=xlsx`
- `GET /exports/attendance?format=excel`
- `GET /exports/attendance?format=pdf`
- `GET /exports/salary-calculation?format=xlsx&employee_id=&from=&to=`
- `GET /exports/salary-calculation?format=pdf&employee_id=&from=&to=`

Contract notes:

- Requires `exports:read`.
- Requires `has_exports`.
- Filtered exports also require `has_advanced_filters`.
- Response is a file download with `Content-Disposition`.
- XLSX/PDF attendance exports include employee, DNI/ID, entry/exit dates and
  times, `hh:mm` duration, status, clock-out source, automatic clock-out
  incidents, notes, company name, report range, and tenant timezone.
- Salary exports include hours, days, shifts, incident count, profile line
  items, and estimated total amount for the requested period.

## Metrics

Visible in the current web UI (`/dashboard`, `/analytics`):

- `GET /metrics/overview`

Contract notes:

- Optional `date_from` and `date_to`.
- Extra report detail depends on `has_admin_reports`.
- Date-range filters require `has_advanced_filters`.

## Tickets

Visible in the current web UI (`/tickets`, `/employee`):

- `GET /tickets`
- `POST /tickets`
- `PATCH /tickets/{ticket_id}`

Contract notes:

- Employees can only read and create tickets for themselves.
- Admin users may filter by `employee_id`, `date_from`, `date_to`, `limit`,
  and `offset`.
- All users may filter by `status`.
- Advanced filters require `has_advanced_filters`.
- Ticket status values are backend-owned: `open`, `in_review`, `resolved`,
  `rejected`. Frontend-only states such as `in_progress` and `closed` are not
  valid ticket statuses.
- Minimal resolution flow:
  - `POST /tickets` creates `open`.
  - Tenant admins/managers may move `open` to `in_review`, `resolved`, or
    `rejected`.
  - Tenant admins/managers may move `in_review` to `resolved` or `rejected`.
  - `resolved` and `rejected` are terminal in the current MVP.
  - Employee users cannot resolve or reject tickets.

### PATCH `/tickets/{ticket_id}`

Request:

```json
{
  "status": "in_review"
}
```

Invalid status values return `422`. Invalid transitions return `409`.

## Locations

Visible in the current web UI:

- `/work-locations` manages work centers with `GET /locations`,
  `POST /locations`, `PATCH /locations/{location_id}`, and
  `DELETE /locations/{location_id}`.
- `/locations` shows attendance location events and map data from
  `GET /attendance-locations`, `GET /attendance-locations/latest`, and
  `GET /attendance-locations/summary`.

Work-location endpoints:

- `GET /locations`
- `POST /locations`
- `PATCH /locations/{location_id}`
- `DELETE /locations/{location_id}`

Creating locations requires `has_multi_location`.
Attendance-location map endpoints require `has_geolocation`. Clock-in/out never
blocks solely because location permission is denied; denied/unavailable status
is stored with the attendance session.

Known MVP limitation: `work_location_id` filtering is present in the
attendance-location query contract but is not linked to sessions yet; geofence
status is computed from stored clock-in/out coordinates and configured centers.

## Schedules

API exists, but there is no current web UI for it:

- `GET /schedules`
- `POST /schedules`
- `GET /schedules/{schedule_id}`
- `PATCH /schedules/{schedule_id}`

The web route `/schedules` is intentionally redirected out of the main product
flow until the full UX is ready.

## Superadmin

Internal-only route. There is no web superadmin console:

- `GET /superadmin/status`

The web route `/superadmin` is intentionally redirected out of the main product
flow.

Authenticated superadmin users are sent to `/access-unavailable` instead of
tenant dashboards. Superadmin is reserved for a future internal console and has
no tenant permissions.

## Production hardening

- Backend and frontend add production security headers: HSTS, CSP,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and
  `Permissions-Policy`.
- Rate limiting defaults to in-process memory for local/dev. Multi-worker
  production can switch strategy with `CLOCKLY_RATE_LIMIT_BACKEND=redis` and
  `CLOCKLY_REDIS_URL`. `CLOCKLY_RATE_LIMIT_ENABLED=false` is rejected in
  production.
- Transactional email defaults to `CLOCKLY_EMAIL_PROVIDER=noop` only outside
  production. Production rejects `noop`; SMTP is the first concrete provider.
  Resend, SendGrid, and Mailgun are reserved adapter names for future provider
  modules.
- Audit logs are written for failed login, invitation lifecycle events, member
  role/access changes, permission denials, auto clock-out settings/execution,
  and salary profile/calculation events.

## MVP publication and staging checklist

- This repo contains the web SaaS frontend and API. It does not contain a
  native Flutter or React Native mobile app.
- Recommended publication order: ship web SaaS + API first, then a native
  mobile app after the core attendance, employee, invitation, ticket, and
  location flows are stable.
- Required staging baseline:
  - managed PostgreSQL
  - `alembic upgrade head`
- real SMTP provider for invitations and password reset
  - Redis-backed rate limiting for multi-worker deployment
  - `CLOCKLY_ENV=production`
  - explicit CORS origins and trusted hosts
  - backups with restore test
  - application logs and audit-log monitoring
- E2E CI is gated by `E2E_ENABLED=true` and `E2E_OWNER_PASSWORD`. Recommended
  scenarios: invitation accepted, employee portal, kiosk with PIN,
  geolocation granted, geolocation denied, and plan gating.
- Self-service company/owner onboarding is available through
  `/register-company` and `/onboarding`; `backend_v2/seed.py` remains local
  demo provisioning only.
- Legal/operational checklist before real customers: privacy policy,
  punctual-geolocation notice, attendance retention policy, data export
  process, terms of service, and documented consent or legal basis for
  geolocation per use case.

## Hidden or retired web surfaces

These are not current product features and must not be described as active:

- expenses UI
- businesses UI / multi-business switcher
- schedules UI
- superadmin UI

## Error format

Application-level errors follow this shape:

```json
{
  "error": {
    "code": "permission_denied",
    "message": "No tienes permisos para realizar esta accion.",
    "details": {}
  }
}
```

Common codes:

- `unauthorized`
- `invalid_credentials`
- `permission_denied`
- `not_found`
- `validation_error`
- `plan_required`

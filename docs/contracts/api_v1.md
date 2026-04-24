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
    "has_admin_reports": true,
    "has_support": true,
    "trial_ends_at": null,
    "is_active_subscription": true,
    "created_by": "uuid"
  },
  "permissions": [
    "attendance:read",
    "attendance:write"
  ]
}
```

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

## Plans

Visible in the current web UI (`/settings`):

- `GET /plans`
- `GET /plans/current`

Plans expose company capabilities such as:

- `has_exports`
- `has_advanced_filters`
- `has_multi_location`
- `has_admin_reports`
- `has_support`

## Employees

Visible in the current web UI (`/employees`):

- `GET /employees`
- `GET /employees/{employee_id}`
- `POST /employees`
- `PATCH /employees/{employee_id}`

Contract notes:

- `GET /employees` supports `include_inactive`, `limit`, and `offset`.
- `EmployeeRead` includes `has_pin` so the frontend can decide kiosk
  availability without exposing PIN material.
- Employee creation can include login credentials and a 4-digit kiosk PIN.

## Attendance

Visible in the current web UI (`/sessions`, `/employee`, `/kiosk`):

- `GET /attendance/sessions`
- `POST /attendance/clock-in`
- `POST /attendance/clock-out`

### GET `/attendance/sessions`

Query params:

- `employee_id`
- `status`
- `date_from`
- `date_to`

Notes:

- Employee users are automatically scoped to their own sessions.
- Advanced filters require `has_advanced_filters`.

### POST `/attendance/clock-in`

Request:

```json
{
  "employee_id": "uuid",
  "method": "kiosk",
  "pin": "1234",
  "notes": "optional"
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
  "notes": "optional"
}
```

Kiosk/PIN rules:

- `pin` must be exactly 4 digits when the action is performed as `kiosk` or
  `pin`.
- Admin-managed kiosk actions are validated in the backend against the
  employee PIN hash.
- Employees clocking their own web session do not need a PIN.

## Exports

Visible in the current web UI when the company plan allows it:

- `GET /exports/attendance?format=xlsx`
- `GET /exports/attendance?format=excel`
- `GET /exports/attendance?format=pdf`

Contract notes:

- Requires `exports:read`.
- Requires `has_exports`.
- Filtered exports also require `has_advanced_filters`.
- Response is a file download with `Content-Disposition`.

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

Contract notes:

- Employees can only read and create tickets for themselves.
- Admin users may filter by `employee_id`, `date_from`, `date_to`, `limit`,
  and `offset`.
- Advanced filters require `has_advanced_filters`.

## Locations

API exists, but there is no current web UI for it:

- `GET /locations`
- `POST /locations`

Creating locations requires `has_multi_location`.

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

## Hidden or retired web surfaces

These are not current product features and must not be described as active:

- forgot password flow
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

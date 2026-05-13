# Roles & Permissions Matrix

Last updated: 2026-04-28

## Role Hierarchy

```text
superadmin   <- platform-internal only; cannot use tenant APIs
owner        <- full business control; can invite/change roles below owner
admin        <- tenant admin; can invite/change hr_manager, manager, employee
hr_manager   <- HR operations; no company settings, billing, integrations, owner management
manager      <- operational attendance/ticket role; no salaries by default
employee     <- own attendance and own tickets
```

## Permission Sets

| Permission | superadmin | owner | admin | hr_manager | manager | employee |
| --- | --- | --- | --- | --- | --- | --- |
| `superadmin:access` | yes | no | no | no | no | no |
| `employees:read` | no | yes | yes | yes | yes | no |
| `employees:write` | no | yes | yes | yes | no | no |
| `schedules:read` | no | yes | yes | no | yes | no |
| `schedules:write` | no | yes | yes | no | no | no |
| `attendance:read` | no | yes | yes | yes | yes | own |
| `attendance:write` | no | yes | yes | no | yes | own |
| `attendance:manage` | no | yes | yes | yes | yes | no |
| `metrics:read` | no | yes | yes | yes | yes | no |
| `tickets:read` | no | yes | yes | yes | yes | own |
| `tickets:write` | no | yes | yes | yes | yes | own |
| `exports:read` | no | yes | yes | yes | no | no |
| `locations:read` | no | yes | yes | no | yes | no |
| `locations:write` | no | yes | yes | no | no | no |
| `settings:read` | no | yes | yes | no | no | no |
| `settings:write` | no | yes | yes | no | no | no |
| `salary:read` | no | yes | yes | yes | no | no |
| `salary:manage` | no | yes | yes | yes | no | no |
| `users:read` | no | yes | yes | yes | no | no |
| `users:write` | no | yes | yes | yes | no | no |
| `users:manage` | no | yes | yes | no | no | no |

Employee "own" scoping is enforced at route/service level.

## Role Management

| Actor | Can assign/create |
| --- | --- |
| owner | admin, hr_manager, manager, employee |
| admin | hr_manager, manager, employee |
| hr_manager | employee through `/users`; cannot change roles or deactivate users |
| manager, employee, superadmin | none through tenant APIs |

Protected rules:

- Owner and superadmin accounts cannot be modified below superadmin level.
- No user can change their own role or activation status.
- The last owner cannot be demoted or revoked.
- Billing and settings remain `owner`/`admin` only.

## Endpoint Matrix

| Area | Endpoint(s) | Roles |
| --- | --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | public/session |
| Employees | `GET /employees`, `GET /employees/{id}` | owner, admin, hr_manager, manager |
| Employees | `POST /employees`, `PATCH /employees/{id}` | owner, admin, hr_manager |
| Users | `GET /users`, `POST /users` | owner, admin, hr_manager scoped by service rules |
| Users admin | role/activation endpoints | owner, admin |
| Attendance | `GET /attendance/sessions` | owner, admin, hr_manager, manager, employee scoped |
| Attendance | `POST /attendance/clock-in`, `POST /attendance/clock-out` | owner, admin, manager, employee scoped |
| Attendance corrections | `PATCH /attendance/sessions/{id}` | owner, admin, hr_manager, manager |
| Auto clock-out settings | `GET/PUT /settings/auto-clock-out` | owner, admin |
| Salary profiles/calculations | `/salary-profiles`, `/salary-calculations` | owner, admin, hr_manager |
| Tickets | `GET /tickets`, `POST /tickets` | owner, admin, hr_manager, manager, employee scoped |
| Members/invitations | `/businesses/{id}/members`, `/businesses/{id}/invitations` | owner, admin |
| Metrics | `GET /metrics/overview` | owner, admin, hr_manager, manager |
| Exports | `GET /exports/attendance` | owner, admin, hr_manager with plan |
| Salary exports | `GET /exports/salary-calculation` | owner, admin, hr_manager with plan |
| Locations | `GET /locations` | owner, admin, manager |
| Locations | `POST /locations` | owner, admin with plan |
| Schedules | `GET /schedules` | owner, admin, manager |
| Schedules | `POST/PATCH /schedules` | owner, admin |
| Billing | `/billing/checkout`, `/billing/portal` | owner, admin |
| Superadmin | `GET /superadmin/status` | superadmin only |

## Product Notes

- `/kiosk` is protected by session and role guard. It is available to owner,
  admin, and manager, not HR by default.
- `/settings` is hidden for HR and returns a clear insufficient-permission UI
  if reached directly; backend settings endpoints return `403`.
- `superadmin` is redirected to `/access-unavailable` and is not treated as a
  tenant admin.
- Automatic clock-out creates `attendance_incidents.type = auto_clock_out`,
  marks the session as `clock_out_source = auto`, and writes audit logs.
- Salary calculations are estimates only, based on closed `attendance_sessions`.

## Test Coverage

- Backend: `test_permissions.py`, `test_hr_manager_role.py`,
  `test_auto_clock_out.py`, `test_salary.py`, `test_security.py`.
- Frontend: route/nav guards are enforced from backend permission lists exposed
  by `GET /auth/me`.

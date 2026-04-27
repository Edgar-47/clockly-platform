# Roles & Permissions Matrix

Last updated: 2026-04-27

## Role Hierarchy

```text
superadmin   <- platform-internal only; cannot use tenant APIs
owner        <- full business control; can invite/change roles below owner
admin        <- tenant admin; can invite/change manager and employee
manager      <- operational role; can manage attendance/tickets, not members
employee     <- own attendance and own tickets
```

## Permission Sets

| Permission | superadmin | owner | admin | manager | employee |
| --- | --- | --- | --- | --- | --- |
| `superadmin:access` | yes | no | no | no | no |
| `employees:read` | no | yes | yes | yes | no |
| `employees:write` | no | yes | yes | no | no |
| `schedules:read` | no | yes | yes | yes | no |
| `schedules:write` | no | yes | yes | no | no |
| `attendance:read` | no | yes | yes | yes | own |
| `attendance:write` | no | yes | yes | yes | own |
| `attendance:manage` | no | yes | yes | yes | no |
| `metrics:read` | no | yes | yes | yes | no |
| `tickets:read` | no | yes | yes | yes | own |
| `tickets:write` | no | yes | yes | yes | own |
| `exports:read` | no | yes | yes | no | no |
| `locations:read` | no | yes | yes | yes | no |
| `locations:write` | no | yes | yes | no | no |
| `users:manage` | no | yes | yes | no | no |

Employee "own" scoping is enforced at route/service level.

## Endpoint Matrix

| Area | Endpoint(s) | Roles |
| --- | --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | public/session |
| Employees | `GET /employees`, `GET /employees/{id}` | owner, admin, manager |
| Employees | `POST /employees`, `PATCH /employees/{id}` | owner, admin |
| Attendance | `GET /attendance/sessions` | owner, admin, manager, employee scoped |
| Attendance | `POST /attendance/clock-in`, `POST /attendance/clock-out` | owner, admin, manager, employee scoped |
| Tickets | `GET /tickets`, `POST /tickets` | owner, admin, manager, employee scoped |
| Members | `GET /businesses/{id}/members` | owner, admin |
| Invitations | `POST/GET /businesses/{id}/invitations` | owner, admin |
| Invitations | `DELETE /businesses/{id}/invitations/{invitation_id}` | owner, admin |
| Invitations | `POST /invitations/{token}/accept` | public token |
| Member roles | `POST /businesses/{id}/members/{user_id}/role` | owner, admin |
| Member access | `DELETE /businesses/{id}/members/{user_id}` | owner, admin |
| Metrics | `GET /metrics/overview` | owner, admin, manager |
| Exports | `GET /exports/attendance` | owner, admin with plan |
| Locations | `GET /locations` | owner, admin, manager |
| Locations | `POST /locations` | owner, admin with plan |
| Schedules | `GET /schedules` | owner, admin, manager |
| Schedules | `POST/PATCH /schedules` | owner, admin |
| Superadmin | `GET /superadmin/status` | superadmin only |

## Invitation Lifecycle

```text
pending -> accepted
pending -> expired
pending -> revoked
```

Invitations expire after 7 days. A non-pending token cannot be reused and returns `409 Conflict`.

## Frontend Contract

- `/kiosk` is protected by session and role guard. It is not public.
- `/settings` exposes members/invitations only when `users:manage` is present.
- `/accept-invitation/{token}` is public and posts to `POST /invitations/{token}/accept`.
- `superadmin` is redirected to `/access-unavailable` and is not treated as a tenant admin.

## Test Coverage

- Backend: `test_invitations.py`, `test_permissions.py`, `test_security.py`, `test_audit_log.py`.
- Frontend E2E: `role-restrictions.spec.ts` and `kiosk.spec.ts` verify protected kiosk routing.

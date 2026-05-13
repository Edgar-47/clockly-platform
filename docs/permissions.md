# ClockLy - Matriz de roles y permisos

Version: 2026-04-28. Fuente tecnica: `backend_v2/app/services/permissions.py`.

## Roles

| Rol | Ambito | Notas |
| --- | --- | --- |
| `superadmin` | Plataforma interna | Reservado para consola interna futura. No entra al dashboard tenant. |
| `owner` | Empresa activa | Control total tenant, miembros, billing y configuracion. |
| `admin` | Empresa activa | Administra operacion y miembros por debajo de admin. |
| `hr_manager` | Empresa activa | Gestiona personas, fichajes, estadisticas, exportaciones y salarios estimados. No configura empresa/local ni billing. |
| `manager` | Empresa activa | Gestiona operacion diaria de asistencia/tickets, sin salarios ni miembros. |
| `employee` | Usuario propio | Asistencia y tickets propios. |

## Permisos backend

| Permiso | owner | admin | hr_manager | manager | employee | superadmin |
| --- | --- | --- | --- | --- | --- | --- |
| `employees:read` | yes | yes | yes | yes | no | no |
| `employees:write` | yes | yes | yes | no | no | no |
| `schedules:read` | yes | yes | no | yes | no | no |
| `schedules:write` | yes | yes | no | no | no | no |
| `attendance:read` | yes | yes | yes | yes | own | no |
| `attendance:write` | yes | yes | no | yes | own | no |
| `attendance:manage` | yes | yes | yes | yes | no | no |
| `metrics:read` | yes | yes | yes | yes | no | no |
| `tickets:read` | yes | yes | yes | yes | own | no |
| `tickets:write` | yes | yes | yes | yes | own | no |
| `exports:read` | yes | yes | yes | no | no | no |
| `locations:read` | yes | yes | no | yes | no | no |
| `locations:write` | yes | yes | no | no | no | no |
| `settings:read` | yes | yes | no | no | no | no |
| `settings:write` | yes | yes | no | no | no | no |
| `salary:read` | yes | yes | yes | no | no | no |
| `salary:manage` | yes | yes | yes | no | no | no |
| `users:read` | yes | yes | yes | no | no | no |
| `users:write` | yes | yes | yes | no | no | no |
| `users:manage` | yes | yes | no | no | no | no |
| `superadmin:access` | no | no | no | no | no | yes |

`superadmin` intentionally has no tenant permissions.

## Gestion de miembros e invitaciones

Rutas reales:

| Endpoint | Roles | Estado |
| --- | --- | --- |
| `GET /businesses/{business_id}/members` | owner, admin | Lista miembros tenant. |
| `POST /businesses/{business_id}/invitations` | owner, admin | Crea invitacion pendiente y devuelve `acceptance_url`. |
| `GET /businesses/{business_id}/invitations` | owner, admin | Lista invitaciones y expira pendientes vencidas. |
| `DELETE /businesses/{business_id}/invitations/{invitation_id}` | owner, admin | Revoca invitaciones pendientes. |
| `POST /businesses/{business_id}/members/{user_id}/role` | owner, admin | Cambia rol con reglas anti-escalado. |
| `DELETE /businesses/{business_id}/members/{user_id}` | owner, admin | Desactiva acceso, protegiendo al ultimo owner. |
| `GET /users`, `POST /users` | owner, admin, hr_manager | HR solo puede crear usuarios `employee`. |

Roles invitables/asignables:

| Actor | Puede invitar/asignar |
| --- | --- |
| owner | admin, hr_manager, manager, employee |
| admin | hr_manager, manager, employee |
| hr_manager | employee via `/users`; no invitaciones ni cambios de rol |
| manager, employee, superadmin | ninguno |

## Desfichaje automatico

- Configuracion: `GET/PUT /settings/auto-clock-out`.
- Solo owner/admin tienen `settings:read` y `settings:write`.
- La ejecucion manual `POST /attendance/sessions/bulk/auto-clock-out` tambien
  requiere `settings:write`.
- El job recomendado es `python backend_v2/scripts/run_auto_clock_out.py`.
- Cada cierre automatico marca `attendance_sessions.clock_out_source = auto`,
  `has_incident = true`, `incident_type = auto_clock_out` y crea una fila en
  `attendance_incidents`.

## Salarios estimados

- Owner/admin/HR tienen `salary:read` y `salary:manage`.
- Manager y employee no ven salarios por defecto.
- Los calculos usan solo `attendance_sessions` cerradas, respetan tenant y
  dividen por tramos cuando cambia el perfil salarial dentro del periodo.
- Advertencia de producto: es calculo estimado, no nomina oficial.

## Kiosk protegido

`/kiosk` requiere sesion autenticada con rol `owner`, `admin` o `manager`.
HR no abre kiosk por defecto. El PIN se valida en backend al fichar.

## Auditoria y seguridad

`AuditLog` registra eventos sensibles:

- login fallido
- invitacion creada/aceptada/revocada
- cambio de rol o revocacion de acceso
- permisos denegados
- cambio y ejecucion de desfichaje automatico
- cambios de perfiles salariales y calculos generados

Rate limiting usa memoria por defecto. Para produccion multi-worker:

- `CLOCKLY_RATE_LIMIT_BACKEND=redis`
- `CLOCKLY_REDIS_URL=redis://...`
- `CLOCKLY_RATE_LIMIT_KEY_PREFIX=clockly:rate-limit`

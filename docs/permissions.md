# ClockLy - Matriz de roles y permisos

Versión: 2026-04-27. Fuente de verdad técnica: `backend_v2/app/services/permissions.py`.

## Roles

| Rol | Ámbito | Notas |
| --- | --- | --- |
| `superadmin` | Interno de plataforma | Reservado para una consola interna futura. No entra al dashboard tenant. |
| `owner` | Empresa activa | Control total tenant y gestión de miembros. |
| `admin` | Empresa activa | Administra operación y miembros por debajo de admin. |
| `manager` | Empresa activa | Lee operación, gestiona asistencia/tickets, no gestiona miembros. |
| `employee` | Usuario propio | Solo asistencia y tickets propios. |

## Permisos backend

| Permiso | owner | admin | manager | employee | superadmin |
| --- | --- | --- | --- | --- | --- |
| `employees:read` | yes | yes | yes | no | no |
| `employees:write` | yes | yes | no | no | no |
| `schedules:read` | yes | yes | yes | no | no |
| `schedules:write` | yes | yes | no | no | no |
| `attendance:read` | yes | yes | yes | own | no |
| `attendance:write` | yes | yes | yes | own | no |
| `attendance:manage` | yes | yes | yes | no | no |
| `metrics:read` | yes | yes | yes | no | no |
| `tickets:read` | yes | yes | yes | own | no |
| `tickets:write` | yes | yes | yes | own | no |
| `exports:read` | yes | yes | no | no | no |
| `locations:read` | yes | yes | yes | no | no |
| `locations:write` | yes | yes | no | no | no |
| `users:manage` | yes | yes | no | no | no |
| `superadmin:access` | no | no | no | no | yes |

`superadmin` intentionally has no tenant permissions. It can only access explicit internal endpoints such as `GET /superadmin/status`.

## Gestión de miembros e invitaciones

Rutas reales:

| Endpoint | Roles | Estado |
| --- | --- | --- |
| `GET /businesses/{business_id}/members` | owner, admin | Lista miembros tenant. |
| `POST /businesses/{business_id}/invitations` | owner, admin | Crea invitación pendiente y devuelve `acceptance_url`. |
| `GET /businesses/{business_id}/invitations` | owner, admin | Lista invitaciones y expira pendientes vencidas. |
| `DELETE /businesses/{business_id}/invitations/{invitation_id}` | owner, admin | Revoca invitaciones pendientes. |
| `POST /invitations/{token}/accept` | público | Acepta token, crea usuario y marca invitación como aceptada. |
| `POST /businesses/{business_id}/members/{user_id}/role` | owner, admin | Cambia rol con reglas anti-escalado. |
| `DELETE /businesses/{business_id}/members/{user_id}` | owner, admin | Desactiva acceso, protegiendo al último owner. |

Roles invitables:

| Actor | Puede invitar/asignar |
| --- | --- |
| owner | admin, manager, employee |
| admin | manager, employee |
| manager, employee, superadmin | ninguno |

Estados de invitación:

| Estado | Significado |
| --- | --- |
| `pending` | Token vigente y no usado. |
| `accepted` | Token usado correctamente; usuario creado. |
| `expired` | Token vencido. La ventana actual es de 7 días. |
| `revoked` | Invitación cancelada por owner/admin. |

El token se almacena únicamente como hash. El enlace raw solo se devuelve al crear la invitación.

## Kiosk protegido

`/kiosk` ya no es público. Requiere sesión autenticada con rol tenant permitido (`owner`, `admin` o `manager`) y después valida el PIN del empleado en backend al fichar entrada/salida.

Usuarios no autenticados son redirigidos a `/login`. `employee` no puede administrar kiosk. `superadmin` tampoco, porque no pertenece al flujo tenant.

## Superadmin

Por decisión de producto, no existe consola web de superadmin en el MVP. El frontend redirige a `/access-unavailable` y muestra una pantalla explícita. El backend mantiene `superadmin:access` solo para endpoints internos.

## Auditoría y seguridad

`AuditLog` registra eventos sensibles:

- login fallido
- invitación creada
- invitación aceptada
- invitación revocada
- cambio de rol
- revocación de acceso
- acceso denegado por permisos

Rate limiting usa memoria por defecto. Para producción multi-worker, la estrategia está encapsulada y puede cambiarse con:

- `CLOCKLY_RATE_LIMIT_BACKEND=redis`
- `CLOCKLY_REDIS_URL=redis://...`
- `CLOCKLY_RATE_LIMIT_KEY_PREFIX=clockly:rate-limit`

Headers de seguridad se aplican en producción en backend y frontend: HSTS, CSP básica, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.

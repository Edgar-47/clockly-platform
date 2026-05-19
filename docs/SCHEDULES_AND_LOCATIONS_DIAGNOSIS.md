# Diagnóstico: Horarios + Centros de Trabajo — ClockLy

## 1. Qué existe ya

### Backend — Schedules

- Tabla `schedules` (migration `20260422_0003`): días booleanos, `entry_time`, `exit_time`, `break_minutes`.
- `employee.schedule_id` FK → schedules (SET NULL).
- Router: `GET /schedules`, `POST /schedules`, `GET /schedules/{id}`, `PATCH /schedules/{id}`.
- Solo soporta un tipo: horario fijo con un único par entrada/salida.
- `_maybe_record_late_arrival` en `attendance_service.py` ya detecta retrasos usando `schedule.entry_time` + `company_settings.late_arrival_grace_minutes`.

### Backend — Locations

- Tabla `company_locations` (migration `20260422_0001`).
- Router `GET/POST/PATCH/DELETE /locations`.
- Endpoint `POST /locations` gateado por plan feature `has_multi_location`.
- `has_multi_location` solo está disponible en plan **BUSINESS** (no en FREE ni PRO).

### Frontend

- `/schedules` existe pero hace `redirect("/dashboard")`.
- `/work-locations` tiene UI completa (form + list + mini-map + responsive).
- Sidebar: enlace a "Centros de trabajo" → `/work-locations`. No hay enlace a "Horarios".
- Hooks/service para locations bien implementados.

---

## 2. Qué falta

### Schedules

- Enum `ScheduleType`: `none | fixed | weekly_custom | flexible_window`.
- Tabla `schedule_rules` para configuración por día (weekly_custom y flexible_window).
- Campos en `schedules`: `schedule_type`, `grace_minutes`, `entry_window_start/end`, `exit_window_start/end`.
- Esquemas Pydantic actualizados para los 4 tipos.
- Lógica de late arrivals actualizada para usar el tipo correcto.
- Endpoint para asignar/desasignar horario a empleado.
- UI completa en `/schedules`.
- Enlace en sidebar.

### Locations

- Quitar o relajar el plan gate de `POST /locations`.
- Añadir manejo de errores en el frontend (try/catch + toast de error).

---

## 3. Causa raíz del fallo de centros de trabajo

```
POST /locations
  → check_plan_feature(db, ctx.company_id, "has_multi_location")
  → company.plan_type != "business"
  → raise PlanRequiredError("Esta funcionalidad requiere plan Business.")
  → HTTP 403
```

El frontend llama `create.mutateAsync(...)` sin try/catch. Cuando el `mutateAsync` lanza, no hay `catch` que muestre un toast de error. El usuario ve el diálogo abierto sin respuesta.

**Solución**: Mover `has_multi_location` a plan PRO (o eliminar el gate, ya que work locations es
necesario para usar geolocalización que ya es feature de PRO) + añadir manejo de errores en frontend.

---

## 4. Plan técnico de implementación

### Migration `20260519_0020_employee_schedules_v2`

1. Añadir enum `schedule_type` a PostgreSQL.
2. Añadir `schedule_type` a `schedules` (default: `fixed`).
3. Hacer `entry_time`/`exit_time` nullable.
4. Añadir `grace_minutes` a `schedules` (nullable INT).
5. Añadir `entry_window_start`, `entry_window_end`, `exit_window_start`, `exit_window_end` a `schedules`.
6. Crear tabla `schedule_rules`.

### Backend

- `models/enums.py`: añadir `ScheduleType`.
- `models/schedule.py`: añadir nuevos campos + relación con rules.
- `models/schedule_rule.py`: nuevo modelo.
- `schemas/schedule.py`: extender schemas para todos los tipos.
- `services/schedule_service.py`: CRUD completo con reglas.
- `api/routes/schedules.py`: añadir endpoint de asignación a empleado.
- `services/attendance_service.py`: `_maybe_record_late_arrival` actualizado.
- `services/plans.py`: `has_multi_location` disponible en PRO y BUSINESS.
- `api/routes/locations.py`: eliminar gate de `POST /locations`.

### Frontend

- `types/schedule.ts`: tipos TypeScript.
- `services/schedules.service.ts`: llamadas API.
- `hooks/use-schedules.ts`: hooks React Query.
- `app/(admin)/schedules/page.tsx`: página real.
- `components/shared/sidebar.tsx`: añadir enlace "Horarios".
- `app/(admin)/work-locations/page.tsx`: manejo de errores.

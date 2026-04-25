# ClockLy — Matriz de roles y permisos

> Versión: 2026-04-26. Esta es la fuente de verdad del modelo de permisos.
> Backend: `app/services/permissions.py`. Frontend: middleware + guards de layout.

---

## Roles

| Rol | Descripción | Ámbito |
|-----|-------------|--------|
| `superadmin` | Administrador interno del producto | Sistema completo (todas las empresas) |
| `owner` | Propietario de la empresa | Su empresa |
| `admin` | Administrador delegado | Su empresa |
| `manager` | Responsable de equipo | Su empresa (lectura extendida, sin escritura de configuración) |
| `employee` | Empleado estándar | Solo sus propios datos |

---

## Permisos por recurso

### Empleados (`/employees`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Listar empleados | ✗ | ✓ | ✓ | ✓ | ✓ |
| Ver empleado | ✗ | ✓ | ✓ | ✓ | ✓ |
| Crear empleado | ✗ | ✗ | ✓ | ✓ | ✓ |
| Editar empleado | ✗ | ✗ | ✓ | ✓ | ✓ |
| Desactivar empleado | ✗ | ✗ | ✓ | ✓ | ✓ |

### Gestión de usuarios (`/users`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Listar usuarios | ✗ | ✗ | ✓ | ✓ | ✓ |
| Ver usuario | ✗ | ✗ | ✓ | ✓ | ✓ |
| Crear usuario admin/manager | ✗ | ✗ | hasta manager | hasta admin | ✓ |
| Cambiar rol | ✗ | ✗ | hasta manager | hasta admin | hasta owner |
| Activar/desactivar usuario | ✗ | ✗ | manager/employee | admin/manager/employee | todos |

**Reglas de escalado de roles (implementadas en `UserService`):**
- Nadie puede asignarse a sí mismo el rol SUPERADMIN via API — validado en Pydantic y en `UserService`.
- Un ADMIN solo puede asignar roles `manager` o `employee`.
- Un OWNER puede asignar roles `admin`, `manager` o `employee`.
- Nadie puede modificar la cuenta de un OWNER/SUPERADMIN salvo el propio SUPERADMIN.
- Nadie puede cambiar su propio rol.

### Fichaje (`/attendance`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Ver sesiones propias | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver sesiones de otros | ✗ (solo propias) | ✓ | ✓ | ✓ | ✓ |
| Fichar entrada (propio) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Fichar entrada (otro empleado) | ✗ | ✓ | ✓ | ✓ | ✓ |
| Fichar salida | ídem entrada | ídem | ídem | ídem | ídem |

### Horarios (`/schedules`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Ver horarios | ✗ | ✓ | ✓ | ✓ | ✓ |
| Crear/editar horarios | ✗ | ✗ | ✓ | ✓ | ✓ |

### Métricas (`/metrics`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Overview | ✗ | ✓ | ✓ | ✓ | ✓ |
| Con filtros de fecha | — | plan PRO+ | plan PRO+ | plan PRO+ | ✓ |

### Tickets (`/tickets`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Ver propios | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver todos | ✗ (solo propios) | ✓ | ✓ | ✓ | ✓ |
| Crear (propio) | ✓ | ✓ | ✓ | ✓ | ✓ |

### Exportaciones (`/exports`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Exportar asistencia | ✗ | ✗ | ✓ (plan PRO+) | ✓ (plan PRO+) | ✓ |

### Ubicaciones (`/locations`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Ver ubicaciones | ✗ | ✓ | ✓ | ✓ | ✓ |
| Crear ubicación | ✗ | ✗ | ✓ (plan BUSINESS) | ✓ (plan BUSINESS) | ✓ |

### Planes (`/plans`)

| Acción | employee | manager | admin | owner | superadmin |
|--------|----------|---------|-------|-------|------------|
| Listar planes disponibles | ✓ (público) | ✓ | ✓ | ✓ | ✓ |
| Ver plan actual | ✓ (autenticado) | ✓ | ✓ | ✓ | ✓ |

---

## Límites por plan

| Característica | FREE | PRO | BUSINESS |
|----------------|------|-----|----------|
| Empleados activos | 5 | 30 | Ilimitados |
| Exportaciones PDF/Excel | ✗ | ✓ | ✓ |
| Filtros avanzados | ✗ | ✓ | ✓ |
| Multi-sede | ✗ | ✗ | ✓ |
| Informes de admin | ✗ | ✓ | ✓ |
| Soporte prioritario | ✗ | ✓ | ✓ |

---

## Invitación/creación de usuarios admin o manager

**Estado actual:** implementado mediante `POST /users` (sin email transaccional).

Flujo disponible:
1. Owner/Admin llama a `POST /users` con `{email, full_name, password, role}`.
2. El nuevo usuario puede hacer login inmediatamente con las credenciales proporcionadas.
3. El admin comunica las credenciales al usuario por un canal seguro fuera de banda.

**Pendiente (requiere backend de email):**
- Sistema de invitación por enlace (`POST /invitations` + token de activación).
- Estados de invitación: pendiente / aceptada / expirada / revocada.
- Flujo de "olvidé mi contraseña" con reset por email (`POST /auth/forgot-password`).

---

## Flujo de superadmin

El rol SUPERADMIN **solo puede crearse** mediante el script `seed.py` con
`--superadmin-email` y `--superadmin-password`. No existe ningún endpoint
público que permita asignar este rol. El endpoint `/superadmin/status`
requiere `role == SUPERADMIN`; cualquier otro rol recibe 403.

---

## Riesgos pendientes antes de publicación

1. **Email transaccional** — sin él, las contraseñas se distribuyen manualmente.
   Impacto: credencial inicial expuesta en el canal de comunicación.
2. **Rate limiting multi-worker** — el `SlidingWindowLimiter` es in-process.
   En producción con múltiples workers, usar `slowapi` + Redis o límite en proxy.
3. **HSTS / CSP** — headers de seguridad adicionales pendientes en `main.py`.
4. **Audit log** — el modelo `AuditLog` existe pero ningún endpoint escribe en él.
   Cambios de rol, creación de usuarios y fichajes deberían auditarse.

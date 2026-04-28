# ClockLy Platform

ClockLy Platform es una base unica para la app web de administracion, el portal
de empleado, el kiosk de fichaje y la API REST que les da servicio. La
arquitectura activa de este repositorio es `frontend-next/` + `backend_v2/`.

## Architecture Source of Truth

- `frontend-next/` es el frontend web real y unico. Usa Next.js App Router.
- `backend_v2/app/` es el backend real y unico. Usa FastAPI + SQLAlchemy.
- `backend_v2/alembic/` contiene las migraciones de base de datos.
- Este repositorio contiene plataforma web SaaS + API. No contiene app nativa
  Flutter ni React Native.
- La sesion la emite el backend mediante cookies HttpOnly
  `clockly_access` y `clockly_refresh`.
- El frontend no guarda tokens en `localStorage`. La verdad de la sesion vive
  en el backend y se hidrata con `GET /auth/me`.
- Este repo no usa hoy `backend/`, `frontend/`, `app/` en la raiz ni
  `/api/v1`. Si ves referencias a eso, son legacy y deben corregirse.

## Flujo real del sistema

```text
Landing (/)
  -> Registro publico (/register-company)
  -> POST /auth/register-company
  -> backend_v2 crea Company + owner + settings y emite cookies HttpOnly
  -> Wizard (/onboarding)
  -> dashboard

Landing (/)
  -> Login (/login)
  -> POST /auth/login
  -> backend_v2 emite cookies HttpOnly
  -> proxy de Next permite acceso a rutas privadas
  -> React Query hidrata la sesion con GET /auth/me

Owner / admin / manager
  -> /dashboard
  -> /employees
  -> /sessions
  -> /analytics
  -> /tickets
  -> /settings
  -> /upgrade
  -> /kiosk (abierto desde sesion admin)

Owner / admin
  -> /settings
  -> gestion de miembros e invitaciones
  -> configuracion de desfichaje automatico

HR manager
  -> /dashboard
  -> /employees
  -> /sessions
  -> /analytics
  -> /tickets
  -> /salaries
  -> sin acceso a /settings, billing, planes ni configuracion sensible

Invited user
  -> /accept-invitation/{token}
  -> preview publico de invitacion
  -> /login

Employee
  -> /employee
  -> fichaje propio
  -> tickets propios

Kiosk
  -> requiere sesion admin activa
  -> solo muestra empleados activos con PIN configurado
  -> valida PIN en backend al fichar entrada o salida
  -> rate limiting por IP/empleado ante intentos repetidos

Superadmin
  -> /access-unavailable hasta que exista consola interna real
```

## Superficies visibles hoy

Rutas web activas y defendibles:

- `/` landing publica
- `/register-company` alta publica de empresa + owner
- `/login` acceso por email + password
- `/forgot-password` solicitud real de reset por email
- `/reset-password/{token}` cambio real de password con token
- `/onboarding` wizard inicial para owner/admin
- `/dashboard` panel admin
- `/employees` gestion de empleados
- `/sessions` historial de fichajes y exportaciones
- `/analytics` metricas conectadas al backend
- `/tickets` incidencias conectadas al backend
- `/salaries` salarios estimados y calculo de pagos por periodo
- `/locations` mapa/listado de eventos de geolocalizacion de fichajes
- `/work-locations` gestion de centros de trabajo
- `/settings` contexto de empresa y plan actual
- `/settings` miembros e invitaciones para owner/admin
- `/settings` desfichaje automatico para owner/admin
- `/upgrade` planes y checkout de Stripe
- `/employee` autoservicio del empleado autenticado
- `/kiosk` kiosk real, protegido y con PIN validado en backend
- `/accept-invitation/{token}` aceptacion publica de invitacion

Superficies retiradas del flujo principal:

- `/expenses` redirige a `/dashboard`
- `/businesses` redirige a `/settings`
- `/schedules` redirige a `/dashboard`
- `/superadmin` queda fuera del flujo principal; superadmin ve `/access-unavailable`

APIs existentes pero no expuestas en la navegacion web actual:

- `/schedules/*`
- `/superadmin/status` (uso interno)

## Estructura del repo

```text
clockly-platform/
  backend_v2/
    app/                # Backend FastAPI real
    alembic/            # Migraciones DB
    tests/              # Tests backend
    seed.py             # Seed local controlado
  frontend-next/        # Frontend Next.js real
  docs/
    contracts/
      api_v1.md         # Contrato actual de la API (nombre historico)
  scripts/              # Utilidades locales
  README.md
  AGENTS.md
  requirements.txt
  docker-compose.yml    # PostgreSQL local opcional
```

## Desarrollo local

### 1. Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
docker compose up -d postgres
cd backend_v2
copy .env.example .env
alembic upgrade head
# Opcional: python seed.py para demo local. El alta real usa /register-company.
python main.py --host 127.0.0.1 --port 8010 --reload
```

### 2. Frontend

En otra terminal:

```powershell
cd frontend-next
npm install
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8010"
npm run dev
```

URLs locales:

- frontend: `http://127.0.0.1:3000`
- backend: `http://127.0.0.1:8010`
- docs FastAPI: `http://127.0.0.1:8010/docs`

## Auth y sesion

- `POST /auth/login` devuelve payload de sesion y fija cookies HttpOnly.
- `POST /auth/register-company` crea el tenant, el owner, la configuracion
  base de onboarding y fija cookies HttpOnly.
- `POST /auth/request-password-reset` siempre responde igual y envia email si
  el usuario existe.
- `POST /auth/reset-password` valida un token seguro, cambia la password,
  invalida el token y revoca refresh tokens activos.
- `GET /auth/me` es la fuente de verdad del usuario actual.
- El proxy de Next solo decide acceso inicial por presencia de cookie.
- El cliente HTTP del frontend hace una unica revalidacion con
  `POST /auth/refresh` cuando recibe `401`.
- Si el refresh falla, el frontend limpia sesion con `POST /auth/logout` y
  vuelve a `/login`.
- El backend acepta `Authorization: Bearer <token>` o la cookie
  `clockly_access`.
- `superadmin` no se considera rol admin tenant; queda reservado para consola
  interna futura.

## Monetizacion

- Planes activos: Free, Pro y Business.
- Los limites de empleados, exportaciones, geolocalizacion, filtros avanzados
  e informes se validan en backend.
- `/upgrade` inicia `POST /billing/checkout` para suscripcion Stripe.
- `/settings` abre `POST /billing/portal` para gestion de facturacion.
- `POST /billing/webhook` sincroniza `customer.subscription.created`,
  `customer.subscription.updated` y `customer.subscription.deleted` con el plan
  del tenant.
- Variables necesarias para cobrar: `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`,
  `CLOCKLY_BILLING_SUCCESS_URL` y `CLOCKLY_BILLING_CANCEL_URL`.

## Fichajes y cumplimiento

- Los fichajes se guardan en UTC y se devuelven al frontend en la zona horaria
  de la empresa.
- `attendance_sessions` impide estados inconsistentes: una sesion abierta no
  puede tener salida/duracion y una cerrada debe tener ambas.
- Admin puede corregir entrada/salida, notas y marcar el registro como
  corregido desde `/sessions`.
- Hay auto-cierre opcional de sesiones abiertas antiguas mediante
  `POST /attendance/sessions/bulk/auto-close`.
- El desfichaje automatico por olvido se configura en `/settings` con una hora
  limite por zona horaria. La ejecucion segura vive en backend con
  `python backend_v2/scripts/run_auto_clock_out.py` o
  `POST /attendance/sessions/bulk/auto-clock-out` para ejecucion manual
  owner/admin.
- Cada desfichaje automatico marca `clock_out_source = auto`, `auto_closed`,
  `has_incident`, `incident_type = auto_clock_out`,
  `closed_automatically_at` y crea `attendance_incidents`.
- Geolocalizacion puntual guarda latitud, longitud y precision cuando el plan
  lo permite; si el empleado deniega permiso, el fichaje sigue siendo valido.

## Roles y RRHH

- Nuevo rol: `hr_manager` / Responsable RRHH.
- Puede gestionar empleados, usuarios de empleado, fichajes, incidencias,
  metricas, exportaciones y salarios estimados.
- No puede modificar configuracion de local/empresa, billing, planes,
  integraciones, owner, roles superiores ni ajustes sensibles.
- La seguridad se aplica en backend por permisos; el frontend solo oculta rutas
  no permitidas.

## Salarios estimados

- Pantalla activa: `/salaries`.
- Endpoints: `/salary-profiles`, `/salary-calculations` y
  `/exports/salary-calculation`.
- Modalidades: por hora, por dia trabajado, por turno, fijo mensual y semanal.
- La fuente de verdad son `attendance_sessions` cerradas; sesiones abiertas se
  ignoran y se reportan como pendientes.
- Los cambios de salario dentro de un periodo se calculan por tramos de
  vigencia y no sobrescriben historicos.
- Advertencia legal mostrada y devuelta por API: "Calculo estimado basado en
  fichajes registrados. Revisar antes de pagar." No es nomina oficial.

## Miembros e invitaciones

- Owner/admin gestionan miembros desde `/settings`.
- `POST /businesses/{id}/invitations` devuelve un `acceptance_url`.
- `/accept-invitation/{token}` permite crear cuenta con nombre y contraseña.
- `GET /invitations/{token}` permite validar el estado antes de mostrar el
  formulario publico.
- `POST /invitations/accept` acepta el token en body; se mantiene
  `POST /invitations/{token}/accept` por compatibilidad.
- Estados soportados: `pending`, `accepted`, `expired`, `revoked`.
- Roles invitables: owner -> admin/hr_manager/manager/employee; admin ->
  hr_manager/manager/employee.
- La invitacion no crea sesion automaticamente; el usuario entra por `/login`.
- Si `CLOCKLY_EMAIL_PROVIDER` esta configurado, el backend intenta enviar email
  transaccional al crear la invitacion. Si el envio falla, la invitacion sigue
  creada y la UI mantiene `acceptance_url` como fallback operativo.
- Al aceptar una invitacion con rol `employee`, el backend crea o enlaza el
  perfil `Employee` de esa empresa para que `/employee` tenga ficha real.

## Publicacion recomendada

Objetivo recomendado: publicar primero web SaaS + API antes de app movil
nativa. El producto publicable de este repo es la plataforma web con portal de
empleado, kiosk protegido y API; una app nativa debe planificarse despues de
estabilizar invitaciones, fichajes, geolocalizacion puntual, empleados y
resolucion de incidencias.

## Bloqueadores MVP y staging

Estado de bloqueadores de publicacion:

- [x] Geolocalizacion permitida en produccion con
  `Permissions-Policy: geolocation=(self)`.
- [x] Invitaciones `employee` enlazan o crean `Employee`.
- [x] Edicion de empleado persiste `hired_on`.
- [x] Tickets usan estados backend: `open`, `in_review`, `resolved`,
  `rejected`.
- [x] Contrato API actualizado para Locations y tickets.
- [x] Onboarding self-service de empresa/owner sin depender de `seed.py`.
- [x] Reset de password real con token seguro y email transaccional.
- [x] Fichajes endurecidos con edicion administrativa y auto-cierre.
- [x] Desfichaje automatico por olvido con incidencia auditable.
- [x] Rol HR manager con permisos limitados.
- [x] Salarios estimados basados en fichajes.
- [x] Exportaciones XLSX/PDF con formato de informe.
- [x] Stripe Checkout, Billing Portal y webhooks de suscripcion.
- [ ] Checklist legal listo antes de clientes reales.

Staging real debe usar PostgreSQL gestionado, `alembic upgrade head`, SMTP real
para invitaciones y reset de password, Redis para rate limit multi-worker,
`CLOCKLY_ENV=production`, CORS y trusted hosts explicitos, backups con prueba de restore, logs de
aplicacion y revision de `audit_logs`.

E2E en CI: activar con `E2E_ENABLED=true` y configurar el secret
`E2E_OWNER_PASSWORD`. Suites recomendadas para el siguiente cierre: invitacion
aceptada, portal empleado, kiosk con PIN, geolocalizacion permitida,
geolocalizacion denegada y plan-gating.

Checklist legal/operativo antes de clientes reales:

- [ ] Politica de privacidad.
- [ ] Aviso de uso de geolocalizacion puntual en fichajes.
- [ ] Politica de retencion de fichajes.
- [ ] Proceso de exportacion de datos.
- [ ] Condiciones del servicio.
- [ ] Consentimiento o base legal para geolocalizacion segun el caso de uso.

## Legacy y limites actuales

- El nombre `docs/contracts/api_v1.md` es historico; la API actual no usa
  prefijo `/api/v1`.
- Hay endpoints backend para horarios y sedes, pero no UI web publica para
  administrarlos.
- Existe un endpoint interno de superadmin, pero no panel web de superadmin.
- La identidad `superadmin` es de plataforma: no debe entrar en dashboards
  tenant. Mientras no exista consola interna, el frontend la envia a
  `/access-unavailable` y el backend no le concede permisos tenant.
- Rate limiting usa memoria por defecto; se puede desactivar solo fuera de
  produccion con `CLOCKLY_RATE_LIMIT_ENABLED=false`. En produccion multi-worker
  se debe configurar Redis con `CLOCKLY_RATE_LIMIT_BACKEND=redis` y
  `CLOCKLY_REDIS_URL`.
- `CLOCKLY_EMAIL_PROVIDER=noop` solo es fallback de desarrollo. En produccion
  se rechaza y debe configurarse SMTP u otro adaptador soportado.
- `AuditLog` registra login fallido, permisos denegados, invitaciones y cambios
  sensibles de miembros.

## Validacion minima antes de cerrar cambios

```powershell
cd backend_v2
$env:PYTHONPYCACHEPREFIX=(Join-Path $env:LOCALAPPDATA "Temp\\clockly-compile-cache")
New-Item -ItemType Directory -Force $env:PYTHONPYCACHEPREFIX | Out-Null
python -m compileall app tests
python -m pytest

cd ..\frontend-next
npm run type-check
npm run lint
npm run build
npm audit --audit-level=moderate
```

Los E2E autenticados requieren `E2E_OWNER_PASSWORD`. En CI, si
`E2E_ENABLED=true` y falta el secret, el job falla antes de ejecutar tests con
un mensaje explicito.

Nota de Windows/OneDrive: si `compileall` falla al escribir en `__pycache__`
existentes, usa `PYTHONPYCACHEPREFIX` apuntando a `%LOCALAPPDATA%\\Temp` como
en el ejemplo para compilar fuera del repo.

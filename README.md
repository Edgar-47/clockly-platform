# ClockLy Platform

ClockLy Platform es una base unica para la app web de administracion, el portal
de empleado, el kiosk de fichaje y la API REST que les da servicio. La
arquitectura activa de este repositorio es `frontend-next/` + `backend_v2/`.

## Architecture Source of Truth

- `frontend-next/` es el frontend web real y unico. Usa Next.js App Router.
- `backend_v2/app/` es el backend real y unico. Usa FastAPI + SQLAlchemy.
- `backend_v2/alembic/` contiene las migraciones de base de datos.
- La sesion la emite el backend mediante cookies HttpOnly
  `clockly_access` y `clockly_refresh`.
- El frontend no guarda tokens en `localStorage`. La verdad de la sesion vive
  en el backend y se hidrata con `GET /auth/me`.
- Este repo no usa hoy `backend/`, `frontend/`, `app/` en la raiz ni
  `/api/v1`. Si ves referencias a eso, son legacy y deben corregirse.

## Flujo real del sistema

```text
Landing (/)
  -> Login (/login)
  -> POST /auth/login
  -> backend_v2 emite cookies HttpOnly
  -> proxy de Next permite acceso a rutas privadas
  -> React Query hidrata la sesion con GET /auth/me

Admin / owner / manager / superadmin
  -> /dashboard
  -> /employees
  -> /sessions
  -> /analytics
  -> /tickets
  -> /settings
  -> /kiosk (abierto desde sesion admin)

Employee
  -> /employee
  -> fichaje propio
  -> tickets propios

Kiosk
  -> requiere sesion admin activa
  -> solo muestra empleados activos con PIN configurado
  -> valida PIN en backend al fichar entrada o salida
```

## Superficies visibles hoy

Rutas web activas y defendibles:

- `/` landing publica
- `/login` acceso por email + password
- `/dashboard` panel admin
- `/employees` gestion de empleados
- `/sessions` historial de fichajes y exportaciones
- `/analytics` metricas conectadas al backend
- `/tickets` incidencias conectadas al backend
- `/settings` contexto de empresa y plan actual
- `/employee` autoservicio del empleado autenticado
- `/kiosk` kiosk real, protegido y con PIN validado en backend

Superficies retiradas del flujo principal:

- `/forgot-password` redirige a `/login`
- `/expenses` redirige a `/dashboard`
- `/businesses` redirige a `/settings`
- `/schedules` redirige a `/dashboard`
- `/superadmin` redirige a `/dashboard`

APIs existentes pero no expuestas en la navegacion web actual:

- `/schedules/*`
- `/locations/*`
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
python seed.py
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
- `GET /auth/me` es la fuente de verdad del usuario actual.
- El proxy de Next solo decide acceso inicial por presencia de cookie.
- El cliente HTTP del frontend hace una unica revalidacion con
  `POST /auth/refresh` cuando recibe `401`.
- Si el refresh falla, el frontend limpia sesion con `POST /auth/logout` y
  vuelve a `/login`.
- El backend acepta `Authorization: Bearer <token>` o la cookie
  `clockly_access`.

## Legacy y limites actuales

- El nombre `docs/contracts/api_v1.md` es historico; la API actual no usa
  prefijo `/api/v1`.
- Hay endpoints backend para horarios y sedes, pero no UI web publica para
  administrarlos.
- Existe un endpoint interno de superadmin, pero no panel web de superadmin.
- No hay flujo real de recuperacion de password en esta version. Por eso no se
  expone al usuario.

## Validacion minima antes de cerrar cambios

```powershell
cd backend_v2
$env:PYTHONPYCACHEPREFIX=(Join-Path $env:LOCALAPPDATA "Temp\\clockly-compile-cache")
New-Item -ItemType Directory -Force $env:PYTHONPYCACHEPREFIX | Out-Null
python -m compileall app tests
python -m pytest

cd ..\frontend-next
npm run type-check
```

Nota de Windows/OneDrive: si `compileall` falla al escribir en `__pycache__`
existentes, usa `PYTHONPYCACHEPREFIX` apuntando a `%LOCALAPPDATA%\\Temp` como
en el ejemplo para compilar fuera del repo.

# ClockLy Backend v2

`backend_v2/` es el backend real de ClockLy. Sirve la API REST consumida por
`frontend-next`, el portal de empleado y el kiosk.

## Architecture Source of Truth

- `app/` es la unica implementacion backend activa de este repo.
- La API actual no usa prefijo `/api/v1`.
- La sesion web se emite con cookies HttpOnly `clockly_access` y
  `clockly_refresh`.
- El backend acepta Bearer tokens o la cookie de acceso para endpoints
  protegidos.
- `alembic/` es la historia de migraciones vigente.

## Estructura

```text
backend_v2/
  app/
    api/            # Routers REST
    core/           # Config, seguridad, cookies, errores
    db/             # Engine y sesiones
    dependencies/   # Auth, tenant context y servicios transversales
    models/         # SQLAlchemy ORM
    repositories/   # Acceso a datos
    schemas/        # Pydantic
    services/       # Reglas de negocio
  alembic/
  tests/
  seed.py
```

## Endpoints activos

### Visibles en el frontend web actual

- `/auth/*`
- `/employees/*`
- `/attendance/*`
- `/exports/attendance`
- `/metrics/overview`
- `/tickets/*`
- `/plans`
- `/plans/current`

### Internos o sin UI web publica hoy

- `/locations/*`
- `/schedules/*`
- `/superadmin/status`

## Arranque local

```powershell
copy .env.example .env
python -m pip install -r ..\requirements.txt
alembic upgrade head
python seed.py
python main.py --host 127.0.0.1 --port 8010 --reload
```

## Seed local

`python seed.py` crea:

- una empresa demo
- un usuario owner
- opcionalmente un superadmin solo si se pasan credenciales explicitas

No hay credenciales personales hardcodeadas para superadmin.
El superadmin actual conserva `company_id` por compatibilidad de esquema, pero
no debe operar dentro del dashboard tenant. La consola interna futura debe
separar esa identidad del tenancy normal.

## Validacion

```powershell
$env:PYTHONPYCACHEPREFIX=(Join-Path $env:LOCALAPPDATA "Temp\\clockly-compile-cache")
New-Item -ItemType Directory -Force $env:PYTHONPYCACHEPREFIX | Out-Null
python -m compileall app tests
python -m pytest
```

## Notas de contrato

- `GET /auth/me` es la fuente de verdad de la sesion.
- El frontend hace refresh controlado con `POST /auth/refresh` tras `401`.
- Las acciones de kiosk validan PIN en backend.
- Las invitaciones intentan email transaccional si `CLOCKLY_EMAIL_PROVIDER` no
  es `noop`; ante fallo de envio se registra el error y se conserva el
  `acceptance_url` de fallback.
- El API de horarios existe, pero su UI web esta retirada del flujo principal
  hasta que el producto este completo end-to-end.

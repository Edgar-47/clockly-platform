# Runbook de staging ClockLy

Este documento describe el proceso operativo para mantener el backend de ClockLy
en Fly.io como staging repetible: desplegar, migrar, validar, conectar frontend y
limpiar datos de smoke test.

## Estado esperado

- App Fly backend: `clockly-api`.
- URL publica actual: `https://clockly-api.fly.dev`.
- Dominio API futuro: `https://api.clockly.es`.
- Healthcheck: `GET /health`.
- Swagger y OpenAPI publicos en produccion: deshabilitados. Es correcto que
  `/docs` y `/openapi.json` devuelvan `404`.
- La DB usa Alembic y debe quedar en `head`.

## Desplegar backend

Desde PowerShell:

```powershell
cd C:\Users\epedr\OneDrive\App_Fichaje\clockly-platform\backend_v2

fly config validate -a clockly-api
fly deploy -a clockly-api
fly checks list -a clockly-api
curl.exe -i https://clockly-api.fly.dev/health
```

`fly.toml` usa `release_command`:

```toml
[deploy]
  release_command = 'python -m alembic upgrade head'
```

Esto ejecuta migraciones forward antes de activar el despliegue. Si Alembic
falla, el deploy debe considerarse fallido y hay que revisar logs antes de
seguir.

## Verificar migraciones

```powershell
fly ssh console -a clockly-api --command "python -m alembic current -v"
fly ssh console -a clockly-api --command "python -m alembic heads"
```

En Windows, `fly ssh console` puede imprimir `Error: Controlador no válido` al
cerrar la sesion aunque el comando remoto haya ejecutado. La salida util es la
revision que imprime Alembic. El estado correcto actual es:

```text
20260512_0019 (head)
```

No ejecutes `alembic downgrade` en staging salvo plan explicito de rollback.

## Smoke test read-only

```powershell
cd C:\Users\epedr\OneDrive\App_Fichaje\clockly-platform\backend_v2

.\scripts\smoke_test_production.ps1 `
  -BASE_URL "https://clockly-api.fly.dev" `
  -Origin "https://app.clockly.es"
```

Este modo valida:

- `/health` = `200`.
- `/docs` = `404`.
- `/openapi.json` = `404`.
- endpoints protegidos sin token = `401`.
- webhook Stripe sin firma = `409`.
- CORS y headers de seguridad.

## Smoke test con escritura

```powershell
.\scripts\smoke_test_production.ps1 `
  -BASE_URL "https://clockly-api.fly.dev" `
  -Origin "https://app.clockly.es" `
  -RunWriteTests
```

El script imprime un identificador:

```text
SmokeRunId=smoke_YYYYMMDDHHMMSS
```

Ese id se usa en empresa, owner, email, empleado y notas de fichaje. Guardalo
para limpiar despues.

## Limpiar datos smoke

Primero diagnostica:

```powershell
fly ssh console -a clockly-api --command "python scripts/cleanup_smoke_data.py --dry-run"
```

Limpieza dirigida de una ejecucion:

```powershell
.\scripts\smoke_test_production.ps1 `
  -BASE_URL "https://clockly-api.fly.dev" `
  -RunCleanup `
  -SmokeRunId "smoke_YYYYMMDDHHMMSS"
```

Limpieza amplia de patrones legacy solo para staging:

```powershell
fly ssh console -a clockly-api --command 'sh -lc "CLOCKLY_ALLOW_SMOKE_CLEANUP=true python scripts/cleanup_smoke_data.py --confirm"'
```

El script solo selecciona datos por patrones seguros:

- empresas `ClockLy Smoke ...` o `ClockLy Billing Smoke ...`;
- emails `clockly-smoke-...@example.invalid` o
  `clockly-billing-smoke-...@example.invalid`;
- o un `SmokeRunId` exacto.

Nunca limpia datos sin coincidencia con esos patrones.

## Revisar logs

```powershell
fly logs -a clockly-api
fly logs -a clockly-api --no-tail
```

Busca:

- `request.completed` con `status_code=500`;
- `UndefinedTable` o errores SQL;
- `request.rejected_by_trusted_host`;
- `Disallowed CORS origin`;
- `Trial machine stopping`.

## Secrets que pisan `[env]`

`fly.toml` documenta valores no sensibles, pero un secret con el mismo nombre
pisa `[env]`.

```powershell
fly secrets list -a clockly-api
fly config show -a clockly-api
```

No imprimas valores de secrets sensibles. Para valores no sensibles puedes
confirmar en logs de arranque:

- `trusted_hosts`;
- `cors_allowed_origins`;
- `frontend_base_url`;
- `trust_proxy_headers`.

## CORS y frontend

Orígenes permitidos actualmente en Fly:

- `https://app.clockly.es`;
- `https://www.clockly.es`.

Bloqueados actualmente:

- `https://clockly.es`;
- `http://localhost:3000`.

No uses `*` con cookies. Si el frontend real se sirve desde el apex
`https://clockly.es`, añade ese origen de forma explicita:

```powershell
fly secrets set CLOCKLY_CORS_ALLOWED_ORIGINS="https://app.clockly.es,https://www.clockly.es,https://clockly.es" -a clockly-api
```

Para desarrollo local, prefiere backend local. Solo añade
`http://localhost:3000` al secret de staging si necesitas que una app local use
la API de Fly con cookies.

Validar preflight:

```powershell
curl.exe -i -X OPTIONS "https://clockly-api.fly.dev/auth/login" `
  -H "Origin: https://app.clockly.es" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type"
```

## Conectar frontend

El frontend real vive en `frontend-next`.

El cliente usa `fetch("/api/...")` con:

```ts
credentials: "include"
```

No guarda tokens en `localStorage`. La sesion vive en cookies HttpOnly
`clockly_access` y `clockly_refresh`.

Para Fly frontend:

```toml
[build.args]
API_URL_INTERNAL = "http://clockly-api.internal:8000"
NEXT_PUBLIC_API_URL = "https://api.clockly.es"
NEXT_PUBLIC_APP_NAME = "ClockLy"
```

Mientras `api.clockly.es` no exista, staging puede usar:

```env
NEXT_PUBLIC_API_URL=https://clockly-api.fly.dev
API_URL_INTERNAL=https://clockly-api.fly.dev
```

Si el frontend tambien corre en Fly dentro de la misma organizacion, conserva
`API_URL_INTERNAL=http://clockly-api.internal:8000` para evitar salir a internet.

## Si `/health` falla

`400`:

- revisar `CLOCKLY_TRUSTED_HOSTS`;
- revisar header `Host` del healthcheck en `fly.toml`;
- buscar `request.rejected_by_trusted_host` en logs.

`500`:

- revisar logs de app;
- comprobar DB y Alembic;
- ejecutar `python -m alembic current -v`.

`502`:

- comprobar que la máquina esta arrancada;
- comprobar que Uvicorn escucha en `0.0.0.0:8000`;
- revisar `fly checks list -a clockly-api`;
- revisar si Fly Trial paro la maquina.

## Fly Trial

Si aparece:

```text
Trial machine stopping
```

no es bug backend. Hay que resolver la cuenta/plan/tarjeta en Fly. Aunque
`/health` este correcto, Fly puede parar la maquina por limitacion de cuenta.

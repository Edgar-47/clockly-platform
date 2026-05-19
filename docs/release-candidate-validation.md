# ClockLy release candidate validation

Fecha: 2026-05-19
Entorno validado: local Windows, backend `127.0.0.1:8010`, frontend `localhost:3000`.
Staging/produccion: no ejecutado en esta ronda.

## 1. Resumen ejecutivo

ClockLy no queda listo como release candidate para demo comercial con cliente real.

La validacion local confirma mejoras importantes: registro y onboarding no activan PRO/BUSINESS por payload manual, work-locations respeta Business, salarios ya formatea fechas locales correctamente, tickets y sesiones no quedan bloqueados en los flujos verificados, y el responsive principal renderiza con hamburger en mobile/tablet.

El bloqueo para RC es que Docker Desktop no esta disponible y no se ha podido ejecutar `pytest` ni las suites backend criticas con DB/testcontainers. Tambien quedan sin smoke real Stripe, staging, produccion e invitaciones con limite PRO/HR.

Decision de release: **NO-GO hasta corregir bloqueantes**.

## 2. Revision de diff

Cambios seguros:
- `RegisterCompanyRequest` y `AuthService.register_company` fuerzan `FREE` en registro publico.
- `OnboardingCompanyUpdate` ignora `plan_type`; onboarding conserva el plan autorizado existente.
- `work-locations` queda bloqueado por `has_multi_location` en API y UI.
- `salaries` usa helper local `YYYY-MM-DD`, evitando desfase UTC en meses locales.
- `tickets` solo mantiene botones en loading mientras la mutacion esta `isPending`.
- `sessions` muestra error persistente junto a salida cuando salida < entrada.
- `onboarding` redirige a `/dashboard` tras completar.
- Copy/accentos corregidos en superficies tocadas.
- Leaflet evita `Map container is already initialized` en navegacion repetida.

Cambios que requieren prueba manual:
- Stripe checkout, portal y webhook en staging.
- Invitaciones employee enlazado, employee nuevo con limite PRO alcanzado y `hr_manager`.
- Flujos completos de expenses/cash/schedules/exports fuera del alcance de esta ronda.

Cambios con riesgo:
- Hay cambios staged preexistentes grandes en landing, SEO, Docker/Fly y runbooks. No parecen tocar auth/RBAC directamente, pero aumentan superficie de release.
- `frontend-next/fly.toml` apunta `API_URL_INTERNAL` a `https://api.clockly.es`; requiere smoke Fly/staging para confirmar latencia/routing/cookies.
- Next avisa que `middleware` esta deprecado en favor de `proxy`.

## 3. Validacion de bugs

- BUG-01: **Cerrado localmente**. API con `plan_type=pro/business` devuelve empresa `free`; UI registro no muestra selector pagado.
- BUG-02: **Cerrado localmente**. PRO sin multi-location recibe bloqueo; Business puede crear/listar centros.
- BUG-03: **Cerrado localmente**. Mayo 2026 muestra `2026-05-01` a `2026-05-31`; cambio manual a junio muestra `2026-06-01` a `2026-06-30`.
- BUG-04: **Cerrado localmente**. Ticket smoke paso de En revision a Resuelta sin botones bloqueados.
- BUG-05: **Cerrado localmente**. Sesion smoke mantiene formulario abierto y error junto a salida; al corregir guarda.
- BUG-07/08: **Parcial / pendiente**. Codigo revisado; suite backend e invitaciones limite/HR quedan pendientes.
- BUG-09: **Cerrado por fix minimo**. `handleComplete` redirige con `router.replace("/dashboard")`.
- BUG-10: **Cerrado en superficies tocadas**. Copy/accentos corregidos en auth, tickets, sesiones, salarios, settings, sidebar y mensajes backend visibles.
- Responsive work-locations: **Cerrado localmente**. PRO ve gate Business; Business ve "Nuevo centro"; hamburger presente en 390/768.

## 4. Tests ejecutados

Backend:
- `docker info --format '{{.ServerVersion}}'`: **FAIL**. Docker Desktop no esta levantado: `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`.
- `python -m compileall backend_v2\app backend_v2\tests` con `PYTHONPYCACHEPREFIX`: **PASS**.
- `.venv\Scripts\python.exe -m pytest backend_v2\tests\test_employee_schema.py backend_v2\tests\test_location_schema.py`: **PASS**, 3 tests.
- `pytest`: **NO EJECUTADO** por Docker no disponible.
- Suites criticas existentes pero pendientes: `test_register_company_billing.py`, `test_invitations.py`, `test_permissions.py`, `test_billing.py`, `test_onboarding.py`, `test_salary.py`.

Frontend:
- `npm run type-check`: **PASS**.
- `npm run lint`: **PASS**.
- `npm run e2e`: **PASS**, 11 passed / 8 skipped.
- `NEXT_DIST_DIR=.next-rc npm run build`: **PASS**. `.next-rc` eliminado y `tsconfig.json` revertido tras el ajuste automatico de Next.
- `npm test`: **NO EXISTE** script `test`.

## 5. Pruebas manuales locales

Registro/API:
- `POST /auth/register-company` con `plan_type=pro`: status 200, plan final `free`.
- `POST /auth/register-company` con `plan_type=business`: status 200, plan final `free`.
- UI `/register-company`: no muestra PRO/BUSINESS ni selector de plan pagado.

Onboarding:
- `PUT /onboarding/company` con `plan_type=business` conserva `free`.
- Tenant PRO autorizado conserva `pro` aunque onboarding envie `business`.
- Redireccion final a dashboard corregida en UI.

Work locations:
- PRO con `has_multi_location=false`: `POST /locations` devuelve 403; UI muestra gate Business.
- BUSINESS con `has_multi_location=true`: `POST /locations` devuelve 201; UI muestra "Nuevo centro" y centro creado.

Salaries:
- Inputs iniciales: `2026-05-01`, `2026-05-31`.
- Cambio manual: `2026-06-01`, `2026-06-30`.

Tickets:
- Ticket smoke creado, pasado a En revision, luego Resuelta.
- Evidencia: botones Resolver/Rechazar aparecen tras En revision y desaparecen tras Resuelta; no quedan disabled.

Sessions:
- Sesion smoke editada con salida `2026-05-19T00:00` anterior a entrada `2026-05-19T11:02`.
- Evidencia: error "La salida no puede ser anterior a la entrada.", formulario sigue abierto; tras corregir a `23:59`, guarda y cierra.

Responsive:
- Rutas probadas en 390, 768, 1024 y desktop: `/dashboard`, `/employees`, `/kiosk`, `/sessions`, `/salaries`, `/tickets`, `/expenses`, `/locations`, `/work-locations`, `/settings`, `/onboarding`.
- Resultado: sin renders vacios, sin hamburger ausente en mobile/tablet, sin console errors tras fix Leaflet.
- Hallazgo: overflow horizontal global en `/dashboard` a 390/1024 y `/salaries` a 768/1024.

Limpieza:
- `scripts/cleanup_smoke_data.py --smoke-run-id rc20260519102050 --confirm`: **PASS**, elimino empresas, usuarios, empleados, sesiones, tickets, tokens y location smoke.

## 6. Seguridad basica post-fix

- No se encontro uso de `localStorage`, `sessionStorage` ni `document.cookie` para tokens.
- Cliente frontend usa `credentials: "include"` en API/exportaciones.
- Cookies backend: `HttpOnly`, `SameSite=Lax`, `Secure` cuando `environment=production`.
- No se encontro endpoint publico para cambiar plan; cambios pagados quedan en billing/Stripe checkout/webhook.
- Webhook Stripe sigue pudiendo aplicar planes desde metadata/precio validado.
- Multi-tenant: rutas revisadas siguen filtrando por `company_id`; tests reales pendientes.
- No se observaron stacktraces 500 en smoke local.

## 7. Riesgos restantes

Criticos:
- Suite backend real `pytest` no ejecutada por Docker Desktop no disponible.

Altos:
- Stripe checkout/portal/webhook no verificados contra staging.
- Invitaciones employee/hr_manager con limite PRO no verificadas manualmente ni por suite backend.
- Staging y produccion no smokeados.

Medios:
- Overflow horizontal en dashboard/salaries en algunos breakpoints.
- Cambios staged grandes de landing/infra no forman parte directa de los bugfixes y requieren smoke propio.
- `API_URL_INTERNAL` en Fly frontend apunta a URL publica.

Bajos:
- Warning Next: `middleware` deprecado.
- Warnings CRLF/LF en `git diff` por entorno Windows.

## 8. Proximo paso recomendado

1. Abrir Docker Desktop.
2. Ejecutar:
   `cd backend_v2`
   `python -m pytest`
   `python -m pytest tests/test_register_company_billing.py tests/test_invitations.py tests/test_permissions.py tests/test_billing.py tests/test_onboarding.py tests/test_salary.py`
3. Corregir cualquier fallo backend.
4. Deploy a staging.
5. Smoke staging: registro, onboarding, billing Stripe, work-locations, salaries, tickets, sessions, invitations.
6. Solo despues preparar demo account y smoke produccion.

No se prepara commit de release porque la decision es NO-GO.

# ClockLy — Release Tracker V1

> **Fuente de verdad del progreso hacia publicación.**
> Actualizar este documento en cada sesión de trabajo relevante.
> Última actualización: 2026-05-07 — Re-auditoría confirmada: los 4 bloqueadores técnicos verificados en código.

---

## 1. Objetivo de la release

Publicar una **V1 gratuita pero profesional** de ClockLy: una plataforma SaaS de control horario para pequeños negocios que sea utilizable por clientes reales, con arquitectura sólida, seguridad correcta y billing completamente preparado para activarse en una fase posterior sin reestructuración mayor.

**Condiciones de "publicable":**
- Un negocio real puede registrarse, configurar empleados, fichar, ver informes y exportar datos
- La plataforma no cobra, pero el sistema de planes y restricciones está estructurado
- No hay datos de un tenant accesibles desde otro
- Auth, permisos y seguridad básica no tienen agujeros graves
- La app no crasha en producción con errores sin gestionar
- Hay un sistema de email funcional para invitaciones y resets
- El deploy está documentado y es reproducible

---

## 2. Estado actual (2026-05-07)

La plataforma está en un estado **avanzado de desarrollo** con fundamentos técnicos sólidos. El backend es el componente más maduro: FastAPI + SQLAlchemy 2.0, multi-tenancy consistente, RBAC completo, Stripe integrado con idempotencia, 29 archivos de test con Testcontainers. El frontend Next.js 16 cubre todos los flujos principales y ya tiene middleware de rutas, CSP endurecida y error boundaries de App Router.

**Veredicto actualizado: No publicable todavía por pendientes legales/staging/email, pero los bloqueadores técnicos V1 detectados el 2026-05-07 quedan cerrados. Publicable en 1–2 semanas con trabajo focalizado.**

No hay deuda técnica estructural que impida la publicación; lo pendiente se concentra en operación, contenido legal y validación de staging.

---

## 2.1 Seguridad — auditoria extrema 2026-05-07

**Estado general:** mejora sustancial del posture de seguridad. La app queda
razonablemente endurecida para una V1 con reservas operativas.

**Bloqueadores de seguridad cerrados:**
- Tokens de access/refresh eliminados del JSON de login/register/refresh; solo
  cookies HttpOnly.
- Refresh token reuse detectado y tratado con revocacion de sesiones activas.
- URLs de reset/invitacion/login dejan de depender de headers controlables y
  salen de `CLOCKLY_FRONTEND_BASE_URL`.
- RBAC backend evita que un admin gestione/desactive/elimine otro admin.
- Exports CSV/XLSX neutralizan formula injection y comparten rate limit en
  modulos sensibles.
- Billing portal bloquea `return_url` externo y webhooks Stripe rechazan
  metadata tenant inconsistente.
- Adjuntos de gastos endurecidos: lectura acotada, magic bytes, extension
  segura, filename saneado y no-store.
- Produccion rechaza defaults inseguros: secret corta, CORS/hosts comodin,
  rate limiter no Redis, email noop y Stripe sin secretos.

**Riesgos pendientes:**
- Invalidacion inmediata de access JWT antes de expiracion.
- Antivirus/sandbox para adjuntos.
- Auditoria de dependencias automatizada en CI.
- Legal/staging/backups/restore/monitoring antes de publicar.

**Documento fuente:** `SECURITY_AUDIT_CLOCKLY.md`.

---

## 3. Checklist maestra

### Producto / Funcionalidad

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| P-01 | Registro de empresa y owner | ✅ hecho | Auth completa con rate limiting |
| P-02 | Invitación de empleados por email | ✅ hecho | Token seguro, expiración, revocación |
| P-03 | Fichaje entrada/salida | ✅ hecho | attendance_sessions es fuente de verdad |
| P-04 | Kiosco PIN | ✅ hecho | Validado en backend, no expone token |
| P-05 | Portal empleado | ✅ hecho | Autoservicio, gating por rol |
| P-06 | Panel administrador | ✅ hecho | Dashboard, empleados, sesiones, analytics |
| P-07 | Gestión de empleados (CRUD) | ✅ hecho | Soft-delete, paginación |
| P-08 | Tickets de incidencia | ✅ hecho | Workflow completo |
| P-09 | Tickets de gasto | ✅ hecho | Workflow completo |
| P-10 | Cierres de caja | ✅ hecho | Con analytics y exportación |
| P-11 | Retrasos / late arrivals | ✅ hecho | Módulo completo |
| P-12 | Salarios | ✅ hecho | Cálculos y perfiles |
| P-13 | Geolocalización | ✅ hecho | GPS, Haversine, mapa Leaflet |
| P-14 | Exportaciones CSV/XLSX | ✅ hecho | Gating por plan |
| P-15 | Onboarding wizard | ✅ hecho | State en company_settings |
| P-16 | Configuración de empresa | ✅ hecho | Timezone, auto-clock-out, etc. |
| P-17 | Auto-cierre de fichajes | ✅ hecho | Scheduler configurado |
| P-18 | GDPR / exportación de datos | [~] parcial | Endpoint existe, UI incompleta, no self-deletion |
| P-19 | Afiliados | [~] parcial | Backend existe, UI sin verificar |
| P-20 | Superadmin console | [ ] pendiente | Redirige a /access-unavailable |
| P-21 | Audit log UI | [ ] pendiente | Eventos grabados, no hay UI para verlos |
| P-22 | Eliminación de cuenta (self-service) | [ ] pendiente | Soft-delete existe, no hay endpoint self-service |

### Backend

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| B-01 | FastAPI + estructura limpia | ✅ hecho | 25 routers, separación limpia |
| B-02 | SQLAlchemy 2.0 + repositorios | ✅ hecho | Patrón Repository consistente |
| B-03 | Migraciones Alembic | ✅ hecho | 22 migraciones, `upgrade head` en init |
| B-04 | Pydantic v2 validación en todas las rutas | ✅ hecho | min_length, max_length en todos los campos |
| B-05 | Exception handlers centralizados | ✅ hecho | AppError, RequestValidationError |
| B-06 | Logging estructurado (structlog) | ✅ hecho | JSON en producción, context binding |
| B-07 | Sentry integration | ✅ hecho | Opcional vía SENTRY_DSN |
| B-08 | Docs desactivados en producción | ✅ hecho | /docs y /redoc ocultos si env != development |
| B-09 | Rate limiting en auth | ✅ hecho | Login, register, password-reset, kiosk |
| B-10 | Rate limiting en GDPR/exports | ✅ hecho | `/exports/*` limitado a 20/5min por empresa+usuario; GDPR general 30/5min y export GDPR 10/10min |
| B-11 | JWT invalidación al cambiar contraseña | [ ] pendiente | Tokens siguen válidos hasta expiración |
| B-12 | Complejidad de contraseña | [~] parcial | min 8 chars, sin validación de charset |
| B-13 | Redis en producción (rate limiter) | [ ] pendiente | Memory backend no apto para multi-instancia |
| B-14 | Health check endpoint | [~] parcial | Verificar si existe /health o similar |
| B-15 | Graceful shutdown | [~] parcial | Por verificar en Uvicorn config |

### Frontend

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| F-01 | Next.js 16 App Router, TypeScript | ✅ hecho | Build limpio |
| F-02 | React Query 5 + invalidación | ✅ hecho | Caché bien configurado |
| F-03 | Formularios con React Hook Form + Zod | ✅ hecho | Validación client-side |
| F-04 | API client con refresh automático | ✅ hecho | 401 → refresh → retry |
| F-05 | Middleware de rutas (cookie guard) | ✅ hecho | `frontend-next/middleware.ts` con `export function middleware`; matcher revisado, redirects sin bucles y rutas protegidas cubiertas |
| F-06 | Error boundaries por ruta | ✅ hecho | `error.tsx` en root, `(admin)`, `(auth)`, `employee`, `kiosk`, `partner`, invitaciones + `global-error.tsx` |
| F-07 | not-found.tsx global | ✅ hecho | Existe en app/ |
| F-08 | Loading states | [~] parcial | Verificar cobertura en rutas lentas |
| F-09 | CSP con unsafe-inline/unsafe-eval | ✅ hecho | CSP movida a `middleware.ts` con nonce por request; `script-src` sin `unsafe-inline` ni `unsafe-eval` en producción |
| F-10 | Responsive / mobile | [~] parcial | Sin verificar sistemáticamente |
| F-11 | Accesibilidad básica (a11y) | [ ] pendiente | No auditado |
| F-12 | Frontend unit tests | [ ] pendiente | Solo E2E, sin unit tests de componentes |
| F-13 | Internacionalización (i18n) | [~] parcial | UI en castellano, sin framework i18n |
| F-14 | PWA / Service Worker | [~] parcial | Config en next.config.ts (/sw.js), sin manifest verificado |

### Auth

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| A-01 | JWT HS256 + HttpOnly cookies | ✅ hecho | clockly_access (15 min) + clockly_refresh (30 días) |
| A-02 | Refresh token rotation | ✅ hecho | Rotación en cada refresh |
| A-03 | Hash de contraseñas (PBKDF2-SHA256) | ✅ hecho | 390.000 iteraciones |
| A-04 | Hash de PINs | ✅ hecho | 10.000 iteraciones (kiosk-level) |
| A-05 | Password reset con token seguro | ✅ hecho | secrets.token_urlsafe, hashed, 60 min TTL |
| A-06 | Rate limiting en todos los endpoints auth | ✅ hecho | Login, register, reset, kiosk |
| A-07 | Tokens no revocados al cambiar password | [ ] pendiente | Mejora de seguridad — baja prioridad para V1 |
| A-08 | Sin requisitos de complejidad de password | [~] parcial | Solo min_length=8, sin uppercase/número/especial |

### Roles y Permisos

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| R-01 | Matriz de permisos RBAC | ✅ hecho | OWNER/ADMIN/HR_MANAGER/MANAGER/EMPLOYEE/SUPERADMIN |
| R-02 | `require_permission()` en todos los routers | ✅ hecho | Decorador consistente |
| R-03 | Gating por rol en frontend | ✅ hecho | useRole(), useAdminSession(), useEmployeeSession() |
| R-04 | SUPERADMIN no puede acceder a datos de tenant | ✅ hecho | Redirigido a /access-unavailable |
| R-05 | HR_MANAGER sin acceso a billing/settings | ✅ hecho | Verificado en matriz |

### Multi-tenant

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| MT-01 | company_id en todos los modelos tenant-scoped | ✅ hecho | FK consistente |
| MT-02 | Todos los repositorios filtran por company_id | ✅ hecho | Patrón consistente en todos los repos |
| MT-03 | TenantContext desde JWT | ✅ hecho | company_id en payload del token |
| MT-04 | Isolation test explícito | ✅ hecho | test_tenancy.py con Testcontainers |
| MT-05 | Slug único por empresa | ✅ hecho | Unique constraint en DB |

### Fichajes

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| FI-01 | Clock in/out con timestamps UTC | ✅ hecho | attendance_sessions fuente de verdad |
| FI-02 | Gestión de sesiones abiertas | ✅ hecho | Status: open/closed/void |
| FI-03 | Auto-cierre de sesiones | ✅ hecho | Scheduler + incident_type |
| FI-04 | Geolocalización en fichaje | ✅ hecho | GPS, Haversine, consentimiento GDPR |
| FI-05 | Incidencias de asistencia | ✅ hecho | attendance_incident model |
| FI-06 | Kiosk PIN clock in/out | ✅ hecho | Validado en backend |
| FI-07 | Historial de sesiones paginado | ✅ hecho | Con filtros |
| FI-08 | Corrección de sesiones por admin | ✅ hecho | Tickets de incidencia |

### Empleados

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| E-01 | CRUD completo + soft-delete | ✅ hecho | is_deleted, deleted_at, deleted_by |
| E-02 | Límite de empleados por plan | ✅ hecho | check_employee_limit() en service |
| E-03 | Email único entre empleados activos | ✅ hecho | Migración 0018 |
| E-04 | Perfiles de salario | ✅ hecho | salary model |
| E-05 | Invitación con token seguro | ✅ hecho | 32+ bytes, hashed, expirable |

### Exportaciones

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| EX-01 | CSV/XLSX de fichajes | ✅ hecho | Gating: has_exports |
| EX-02 | Payroll A3/Holded | [~] parcial | Backend posiblemente implementado, sin verificar completamente |
| EX-03 | Rate limit en exportaciones | ✅ hecho | Presupuesto compartido para endpoints `/exports/*`, con pruebas de 429 |
| EX-04 | Formato compatible con normativa laboral ESP | [~] parcial | A verificar con asesor |

### Billing preparado (no activo)

Ver sección 7 completa.

### Seguridad

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| S-01 | CORS con whitelist explícita | ✅ hecho | Configurable por env |
| S-02 | TrustedHost middleware | ✅ hecho | Configurable por env |
| S-03 | Security headers backend | ✅ hecho | HSTS, CSP, X-Frame-Options, Permissions-Policy |
| S-04 | Security headers frontend (next.config.ts) | ✅ hecho | Producción únicamente |
| S-05 | CSP con 'unsafe-inline' y 'unsafe-eval' | ✅ hecho | `script-src` endurecido con nonce + `strict-dynamic`; queda `style-src 'unsafe-inline'` por Leaflet/charts |
| S-06 | SQL injection | ✅ hecho | ORM parameterizado, sin raw SQL |
| S-07 | XSS | ✅ hecho | React escaping + CSP con nonce para scripts en producción |
| S-08 | CSRF | ✅ hecho | SameSite=Lax + HttpOnly cookies |
| S-09 | No secrets en repositorio | ✅ hecho | .env no trackeado por git |
| S-10 | Stripe webhook signature verification | ✅ hecho | construct_event() con webhook_secret |
| S-11 | Audit log de eventos de seguridad | ✅ hecho | audit_log model + service |
| S-12 | Sentry redacta datos sensibles | ✅ hecho | Passwords, tokens, coordenadas |
| S-13 | Rate limit en GDPR | ✅ hecho | GDPR general y exports JSON limitados por empresa+usuario |
| S-14 | Penetration testing | [ ] pendiente | No realizado |
| S-15 | OWASP Top 10 review formal | [ ] pendiente | No documentado |

### Legal / Compliance mínimo

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| L-01 | Política de Privacidad accesible | [ ] pendiente | No hay página /privacy en la app |
| L-02 | Términos y Condiciones accesibles | [ ] pendiente | No hay página /terms |
| L-03 | Cookie consent banner | [ ] pendiente | HttpOnly cookies sin consentimiento explícito |
| L-04 | Consentimiento geolocalización | ✅ hecho | geo_consent_log model + GDPR service |
| L-05 | Exportación de datos GDPR | [~] parcial | Endpoint existe, UI incompleta |
| L-06 | Eliminación de cuenta self-service | [ ] pendiente | GDPR Art. 17 — derecho al olvido |
| L-07 | DPA / Procesador de datos | [ ] pendiente | Si procesan datos de empleados de clientes |
| L-08 | Retención de datos y borrado | [ ] pendiente | Política no definida |
| L-09 | LOPD-GDD aplicable (España) | [ ] pendiente | Asesor legal recomendado |

### Infra / Deploy

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| I-01 | Docker Compose (Postgres 16 + Redis 7) | ✅ hecho | Con health checks y volúmenes |
| I-02 | Next.js `output: standalone` | ✅ hecho | Optimizado para contenedores |
| I-03 | CI/CD GitHub Actions | ✅ hecho | Backend lint+test, frontend type+build+E2E |
| I-04 | `.env.example` bien documentado | ✅ hecho | Todas las variables documentadas |
| I-05 | Entorno de staging | [ ] pendiente | No documentado |
| I-06 | Backups de base de datos | [ ] pendiente | Estrategia no definida |
| I-07 | Monitorización / alertas | [~] parcial | Sentry disponible, sin uptime monitoring |
| I-08 | Redis para rate limiter en producción | [ ] pendiente | Memory backend no apto para multi-instancia |
| I-09 | Health check endpoint documentado | [~] parcial | Verificar `/health` |
| I-10 | Rollback plan documentado | [ ] pendiente | Sin runbook |
| I-11 | SSL/TLS obligatorio | ✅ hecho | HSTS en headers, requiere HTTPS |
| I-12 | Dominio y DNS configurados | [ ] pendiente | Operacional, no técnico |
| I-13 | NEXT_PUBLIC_API_URL en producción | [ ] pendiente | Requiere configuración explícita |

### QA / Testing

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| Q-01 | Tests backend (29 archivos, Testcontainers) | ✅ hecho | auth, permisos, tenancy, billing, etc. |
| Q-02 | Tests E2E Playwright (4 specs) | ✅ hecho | auth, employees, kiosk, role-restrictions |
| Q-03 | Test de aislamiento multi-tenant | ✅ hecho | test_tenancy.py explícito |
| Q-04 | Test de billing + webhooks | ✅ hecho | test_billing.py |
| Q-05 | Frontend unit tests | [ ] pendiente | No existen tests de componentes |
| Q-06 | Test de flujo de onboarding completo | [ ] pendiente | E2E no cubre onboarding wizard |
| Q-07 | Test de exportaciones | [ ] pendiente | Flujo XLSX/CSV sin test E2E |
| Q-08 | Smoke test de producción post-deploy | [ ] pendiente | Sin runbook |

### Documentación

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| D-01 | AGENTS.md / README técnico | ✅ hecho | Existe documentación interna |
| D-02 | Contratos API (docs/contracts/) | ✅ hecho | web_mobile_parity.md, migration_notes.md |
| D-03 | .env.example completo | ✅ hecho | Todas las vars con comentarios |
| D-04 | Runbook de deploy | [ ] pendiente | No documentado |
| D-05 | Runbook de rollback | [ ] pendiente | No documentado |
| D-06 | Documentación de usuario / help center | [ ] pendiente | No existe |
| D-07 | Changelog público | [ ] pendiente | No existe |

---

## 4. Bloqueadores actuales

> Estos puntos deben cerrarse antes de cualquier publicación.

### [RESUELTO-1] Middleware de rutas revisado y activo
- **Archivo**: `frontend-next/middleware.ts`
- **Fix aplicado**: Se eliminó `proxy.ts`, se creó `middleware.ts` con `export function middleware`, se revisó matcher, se excluyeron assets/prefetch/API, se preservó `next` con querystring y `/dashboard`, `/employee`, `/kiosk`, `/partner` y rutas admin quedan protegidas por cookie guard sin redirects circulares.

### [RESUELTO-2] Error boundaries en el frontend
- **Problema**: No existe ningún archivo `error.tsx` en ninguno de los grupos de rutas de Next.js App Router (`(admin)/`, `(auth)/`, `employee/`, etc.). Un error no capturado en un Server Component o en el render de una ruta crashea toda la página sin recovery.
- **Consecuencia**: En producción, cualquier excepción inesperada resulta en pantalla en blanco o error genérico de Next.js, sin feedback útil al usuario y sin posibilidad de navegar hacia atrás.
- **Fix aplicado**: `RouteErrorFallback` centralizado, `error.tsx` en root, `(admin)`, `(auth)`, `employee`, `kiosk`, `partner`, `accept-invitation` y `global-error.tsx`. Todos incluyen fallback claro y botón `reset()`.

### [RESUELTO-3] CSP con nonce para scripts
- **Archivo**: `frontend-next/next.config.ts`, línea 12.
- **Problema**: `script-src 'self' 'unsafe-inline' 'unsafe-eval'` anula prácticamente toda la protección CSP contra XSS. Cualquier inyección de script inline tendría ejecución libre.
- **Consecuencia**: El CSP existe pero no protege. Dar falsa sensación de seguridad.
- **Fix aplicado**: CSP movida desde `next.config.ts` a `middleware.ts`, con nonce por request y render dinámico en root layout. `script-src` de producción queda sin `unsafe-inline` ni `unsafe-eval`.
- **Limitación documentada**: `style-src 'unsafe-inline'` permanece por uso actual de estilos inline controlados en Leaflet y charts; no habilita ejecución de scripts.

### [RESUELTO-4] Rate limiting en endpoints de exportación y GDPR
- **Archivos**: `app/api/routes/exports.py`, `app/api/routes/gdpr.py`
- **Problema**: Los endpoints de exportación masiva y GDPR no tienen rate limiting. Un usuario autenticado (o atacante con sesión robada) puede descargar datos masivamente en bucle.
- **Consecuencia**: Riesgo de data exfiltration + carga indebida en DB.
- **Fix aplicado**: Limiters en `app/core/rate_limit.py`, aplicados a todos los endpoints `/exports/*` y `/gdpr/*`. La clave es empresa+usuario para evitar falsos positivos por IP compartida. Tests nuevos cubren 429 en exports y GDPR.
- **Esfuerzo**: 1–2 horas.

---

## 5. Trabajo importante antes de publicar

> No bloquean técnicamente al 100%, pero sería mala práctica publicar sin resolverlos.

| Pri | Ítem | Detalle |
|-----|------|---------|
| 1 | **Email provider en producción** | Configurar y verificar Resend o SMTP. Sin email, las invitaciones y password resets no funcionan. Añadir validación que impida `email_provider=noop` en `CLOCKLY_ENV=production`. |
| 2 | **Páginas legales (Privacy + ToS)** | Sin `/privacy` ni `/terms` no se puede publicar como SaaS para clientes. Mínimo: páginas estáticas con texto básico revisado por asesor. |
| 3 | **Cookie consent banner** | Las cookies de sesión se establecen antes de consentimiento. En España/UE, las cookies "necesarias" pueden tener exención, pero conviene documentarlo y añadir el banner. |
| 4 | **Complejidad de contraseña** | Mínimo 8 chars está bien, pero añadir al menos 1 número o mayúscula mejora la seguridad de cuentas de admin. |
| 5 | **Redis para rate limiter** | Si el deploy es multi-instancia (recomendado), el rate limiter en memoria no comparte estado. Configurar `CLOCKLY_RATE_LIMIT_BACKEND=redis`. |
| 6 | **Staging environment** | Tener un entorno de staging donde probar antes de deployo a producción. Documentar la diferencia de configuración. |
| 7 | **Backups de base de datos** | Definir estrategia mínima: snapshots diarios en el proveedor cloud + punto de restauración probado. |
| 8 | **Smoke test post-deploy** | Runbook de 5 pasos para verificar que el deploy funcionó correctamente (login, fichaje, invite, export, webhook). |
| 9 | **Health check endpoint** | Verificar que existe `/health` o `/api/health` que responda correctamente para load balancers y monitoring. |
| 10 | **GDPR self-deletion** | Implementar endpoint para que un usuario pueda solicitar el borrado de su cuenta (GDPR Art. 17). Puede ser "soft" con revisión manual al inicio. |

---

## 6. Trabajo post-lanzamiento

> Se puede dejar para después de publicar sin comprometer la V1.

- Superadmin console real (actualmente redirige a /access-unavailable)
- Audit log UI para que admins vean eventos de seguridad
- Requisitos de complejidad de contraseña avanzados
- Invalidación de JWT al cambiar contraseña
- Frontend unit tests de componentes
- Test E2E del flujo de onboarding completo
- Test E2E de exportaciones
- Internacionalización (i18n) para mercados fuera de España
- PWA / service worker completo
- Accesibilidad (a11y) formal
- Penetration testing profesional
- OWASP Top 10 review documentado
- Changelog público
- Help center / documentación de usuario
- Afiliados: UI completamente verificada
- DPA formal con clientes (cuando haya datos reales de empleados)

---

## 7. Billing readiness

### Estado actual

El sistema de billing es **sorprendentemente completo para ser una V1**. Lo que existe:

| Componente | Estado | Notas |
|-----------|--------|-------|
| Modelo de planes (FREE/PRO/BUSINESS) | ✅ | `plans.py` — definición limpia con features por plan |
| Feature flags en Company model | ✅ | has_exports, has_geolocation, has_multi_location, etc. |
| Límite de empleados por plan | ✅ | max_employees con check_employee_limit() |
| `apply_plan_to_company()` | ✅ | Transición de plan en un solo call |
| `check_plan_feature()` / `check_company_plan_feature()` | ✅ | Gating en service layer, PlanRequiredError con details |
| Stripe customer_id en Company | ✅ | stripe_customer_id, stripe_subscription_id |
| Stripe subscription status | ✅ | stripe_subscription_status, stripe_current_period_end, cancel_at_period_end |
| Stripe SDK integrado | ✅ | stripe>=11.6 |
| Checkout session (POST /billing/checkout) | ✅ | Con metadata company_id, plan_type |
| Customer portal (POST /billing/portal) | ✅ | Para gestión de suscripción |
| Webhook endpoint (POST /billing/webhook) | ✅ | Signature verification con construct_event() |
| Idempotencia de webhooks | ✅ | stripe_webhook_event table + IntegrityError race condition handling |
| Detección de eventos stale | ✅ | _is_stale_subscription_event() — evita downgrade por eventos desordenados |
| Sync de estado subscription → company | ✅ | handle_event() → apply_plan_to_company() |
| Degradación a FREE en cancelación | ✅ | _handle_subscription_deleted() → apply_plan_to_company(FREE) |
| Variables de entorno para Stripe | ✅ | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, STRIPE_PRICE_BUSINESS |
| CompanyUsageLog | ✅ | Registro de features usadas/bloqueadas |
| Plan UI (/upgrade, /settings billing) | ✅ | Frontend para seleccionar plan y ir a Stripe |

### Qué falta para activar billing completamente

| Ítem | Prioridad | Notas |
|------|-----------|-------|
| Configurar price_ids reales en Stripe Dashboard | Alta | STRIPE_PRICE_PRO y STRIPE_PRICE_BUSINESS deben existir en Stripe |
| Verificar webhook signing secret en producción | Alta | Necesita configuración en Stripe Dashboard |
| Trial period definido | Media | No hay `trial_ends_at` activo — considerar free trial de 14 días |
| Emails de billing (factura, renovación, cancelación) | Media | No implementados — Stripe puede enviarlos directamente |
| Página de éxito post-checkout | Baja | /settings?billing=success existe, verificar UX |
| Mecanismo para "reactivar" empresa con pago vencido | Baja | Flujo de re-suscripción tras cancelación |
| Test de webhook end-to-end en staging con Stripe CLI | Alta | Crítico antes de activar cobro |

### Estrategia para V1 sin cobrar (recomendada)

La arquitectura ya soporta esta estrategia perfectamente:

1. **No configurar STRIPE_SECRET_KEY en producción** → todos los endpoints de billing devuelven ConflictError 409 graciosamente → no hay checkout activo
2. **Todas las empresas arrancan en plan FREE** → ya es el comportamiento por defecto en `register_company()`
3. **FREE plan: 5 empleados, sin exports avanzados** → gating activo y funcionando
4. **Ocultar o desactivar el botón "Upgrade"** en la UI hasta que se quiera activar el cobro
5. **Opcionalmente**: Mover a todos los usuarios beta a plan PRO temporalmente con `apply_plan_to_company(company, PlanType.PRO)` para que tengan acceso completo durante el beta

**Para activar billing en el futuro:**
1. Crear products y prices en Stripe Dashboard
2. Configurar STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, STRIPE_PRICE_BUSINESS
3. Registrar el webhook endpoint en Stripe (POST /billing/webhook)
4. Mostrar botón "Upgrade" en UI
5. Testear con Stripe CLI (`stripe trigger checkout.session.completed`)
6. Deploy

**Estimación**: Activar billing desde el estado actual requiere ~1 día de trabajo (configuración + testing), no semanas de desarrollo.

---

## 8. Roadmap por fases

### Fase 0 — Cerrar bloqueadores (1–3 días)
- [x] BLOQUEADOR-1: `middleware.ts` activo y matcher revisado
- [x] BLOQUEADOR-2: Crear `error.tsx` en grupos de rutas
- [x] BLOQUEADOR-3: Fix CSP con nonce y compensación documentada en estilos
- [x] BLOQUEADOR-4: Rate limiting en exports y GDPR

### Fase 1 — Dejar V1 publicable (1–2 semanas)
- [ ] Email provider configurado y verificado en staging
- [ ] Páginas /privacy y /terms
- [ ] Cookie consent banner
- [ ] Redis rate limiter en producción
- [ ] Staging environment funcional
- [ ] Backups configurados
- [ ] Smoke test runbook
- [ ] Complejidad de contraseña mejorada
- [ ] Health check endpoint verificado
- [ ] GDPR self-deletion (mínimo via email/soporte)

### Fase 2 — Activar billing (1–2 semanas después del lanzamiento)
- [ ] Stripe products y prices configurados
- [ ] Test end-to-end con Stripe CLI
- [ ] Emails de billing activados (via Stripe)
- [ ] Página de upgrade visible en UI
- [ ] Monitorización de webhook events en dashboard
- [ ] Trial period definido e implementado

### Fase 3 — Mejoras post-release (continuo)
- [ ] Superadmin console
- [ ] Audit log UI
- [ ] Frontend unit tests
- [ ] E2E de onboarding y exportaciones
- [ ] PWA completo
- [ ] Accesibilidad formal
- [ ] Penetration testing
- [ ] i18n para mercados adicionales
- [ ] Help center

---

## 9. Progreso

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-05-07 | Auditoría completa inicial | Diagnóstico completo. 4 bloqueadores identificados. Billing >80% listo. Veredicto: publicable en 2–4 semanas. |
| 2026-05-07 | Cierre de bloqueadores técnicos V1 | Middleware Next endurecido, CSP con nonce, error boundaries principales, rate limiting en exports/GDPR y tests/docs actualizados. Veredicto técnico mejora: quedan pendientes de publicación no-código/staging. |
| 2026-05-07 | Re-auditoría de bloqueadores (verificación en código) | BLOQUEADOR-1 ✅ `middleware.ts`:76 `export function middleware`. BLOQUEADOR-2 ✅ 7 `error.tsx` + `global-error.tsx`. BLOQUEADOR-3 ✅ CSP nonce sin unsafe-*. BLOQUEADOR-4 ✅ export_limiter + gdpr_limiter + gdpr_export_limiter activos. Fase 0 completamente cerrada. |

---

## 10. Decisión de salida

### Veredicto actual: **Casi publicable; pendiente staging/legal/email**

**Por qué:**
- Los 4 bloqueadores técnicos detectados el 2026-05-07 están cerrados en código.
- No hay páginas legales (Privacy Policy, ToS)
- El email provider no está configurado para producción
- Falta validación completa en staging con Redis si se despliega en más de una instancia.

**Por qué está muy cerca:**
- El backend es sólido: multi-tenancy, RBAC, auth, billing, tests — todo bien hecho
- El billing está prácticamente production-ready aunque no se active el cobro
- La seguridad base es correcta y los problemas de superficie principales ya están mitigados

**Estimación realista para llegar a publicable**: 1–2 semanas de trabajo enfocado cerrando Fase 1 y staging.

---

*Documento creado: 2026-05-07 | Próxima revisión: validación de staging y checklist legal/email*

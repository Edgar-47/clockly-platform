# SECURITY AUDIT — CLOCKLY

Fecha: 2026-05-22

## 1. Resumen ejecutivo

Se hizo una auditoria practica de seguridad sobre la arquitectura activa:
`backend_v2/app` y `frontend-next`. Antes del hardening, la base ya tenia
multi-tenant con `company_id`, RBAC, cookies HttpOnly, Stripe con firma de
webhook y rate limiting en auth/GDPR/exportaciones principales. Aun asi, habia
debilidades explotables razonables para una SaaS laboral: tokens expuestos en
respuestas JSON, URLs sensibles construidas desde headers controlables, reuse de
refresh token sin revocacion de sesion completa, gaps de RBAC entre admins,
formula injection en exports, adjuntos endurecibles, return_url abierto en
billing, confianza excesiva en metadata de Stripe y errores/logs con datos
sensibles.

La app queda mucho mas endurecida para una V1 realista: sesion por cookies
HttpOnly sin tokens en JSON, CSRF por Origin/Referer en produccion, URLs de
frontend confiables desde config, rate limits ampliados, exports no cacheables y
formula-safe, uploads con limite por lectura acotada, magic bytes y nombres
seguros, RBAC corregido para pares admin, webhook billing mas defensivo y
produccion con defaults peligrosos rechazados.

Revision adicional 2026-05-22: se auditaron de nuevo flujos tenant-sensitive
en gastos, tickets, retrasos, usuarios, empleados y settings. Se cerraron
gaps de perfiles `employee` sin `Employee` vinculado, revocacion de sesiones
en cambios sensibles y validaciones que podian terminar en registros
huerfanos, agregados indebidos o errores de base de datos.

## 2. Hallazgos

| Severidad | Vulnerabilidad | Impacto / vector | Fix aplicado | Estado | Bloquea publicacion |
|---|---|---|---|---|---|
| CRITICO | Login/register/refresh devolvian access/refresh tokens en JSON | XSS o dependencia frontend podia exfiltrar bearer/refresh pese a cookies HttpOnly | `TokenResponse` ya no serializa tokens; frontend types y tests actualizados | Cerrado | Si, antes del fix |
| ALTO | Reset/invitaciones/login URLs dependian de request origin/base_url | Host-header/origin poisoning podia enviar enlaces con token a dominio atacante | `CLOCKLY_FRONTEND_BASE_URL` y `build_frontend_url()` como unica fuente | Cerrado | Si, antes del fix |
| ALTO | Refresh token reuse no revocaba sesiones hijas | Replay de refresh antiguo podia mantener sesion robada activa | Deteccion de reuse y revocacion de refresh tokens activos del usuario | Cerrado | Si, antes del fix |
| ALTO | Admin podia desactivar/eliminar otro admin | Escalada lateral/degradacion de privilegios entre pares | `_assert_can_manage_user()` exige que el rol objetivo sea gestionable por actor | Cerrado | Si, antes del fix |
| ALTO | Desactivar usuarios/empleados o cambiar password de empleado no revocaba refresh tokens activos | Un refresh token antiguo podia volver a emitir sesion tras reactivacion o mantener acceso tras cambio sensible | Revocacion de refresh tokens en `UserService.set_active(false)` y en cambios sensibles de `EmployeeService` | Cerrado | Si, antes del fix |
| ALTO | Usuario `employee` podia ver agregados/rankings indebidos de gastos/retrasos | Broken access control interno: summary/stats/charts y `top_employees` podian devolver datos de empresa fuera del perfil propio | Respuestas vacias sin perfil vinculado, `top_employees` filtrado por employee propio y scope defensivo en detalle | Cerrado | Si, antes del fix |
| MEDIO | Usuario `employee` sin perfil podia crear tickets/gastos sin `employee_id` | Registros huerfanos visibles a admins y ambiguedad de propiedad/auditoria | Creacion rechazada con perfil de empleado inexistente; lectura de gasto huerfano denegada | Cerrado | No, pero importante |
| MEDIO | PATCH de gastos aceptaba fecha futura y textos largos sin limite | Datos de gasto inconsistentes y payloads operativos innecesariamente grandes | Validacion de fecha futura y `max_length` en descripcion/notas internas tambien en update | Cerrado | No |
| MEDIO | PATCH de empleados/settings aceptaba nombres en blanco como `None` | Posibles errores 500 o corrupcion de campos obligatorios (`first_name`, `last_name`, tenant `name`) | Validadores separan campos obligatorios de campos limpiables y devuelven `422` | Cerrado | No |
| ALTO | Formula injection en CSV/XLSX | Valores como `=HYPERLINK(...)` en empleados/notas podian ejecutarse al abrir exports | `safe_spreadsheet_value()` aplicado a exports de asistencia, ITSS, payroll, gastos, retrasos y caja | Cerrado | Si, antes del fix |
| ALTO | Stripe subscription metadata podia cruzar tenants si discrepaba con mapping almacenado | Webhook manipulado o inconsistente podia actualizar empresa equivocada | Se prioriza subscription/customer almacenado y se rechaza metadata conflictiva | Cerrado | Si, antes del fix |
| MEDIO | `return_url` de Billing Portal aceptaba URLs externas | Open redirect/phishing tras portal Stripe | Solo URLs relativas o del frontend/CORS confiable | Cerrado | No si se desactiva billing; si con billing publico |
| MEDIO | Upload de gastos leia archivo completo y validaba WebP/PDF debilmente | DoS de memoria moderado, MIME spoofing y nombres peligrosos | Lectura acotada a 5 MB + 1, magic bytes estrictos, extension forzada, nombres saneados, no-store | Cerrado | No, pero recomendable |
| MEDIO | `location_id` en gastos no se validaba contra tenant al crear/editar | IDOR/write con local de otra empresa si se adivinaba UUID | Check activo por `CompanyLocation.company_id` | Cerrado | Si, antes del fix |
| MEDIO | Rate limit de exports no cubria todos los modulos sensibles | Exfiltracion masiva via gastos/retrasos/caja | Presupuesto compartido por empresa+usuario en exports de dominio | Cerrado | No, pero recomendable |
| MEDIO | Rate limiting confiaba siempre en `X-Forwarded-For` | Bypass por spoofing de IP si no habia proxy confiable | `CLOCKLY_TRUST_PROXY_HEADERS=false` por defecto | Cerrado | Depende del deploy |
| MEDIO | Errores 422 incluian `input` de Pydantic | Passwords/tokens invalidos podian volver en respuesta/logs cliente | Handler elimina `input` y `url` | Cerrado | No, pero recomendable |
| MEDIO | Logs stdlib de empleados incluian DNI/email/nombres y errores DB | Fuga de PII en logs/Sentry/centralizacion | Logs reducidos a IDs/eventos genericos | Cerrado | No, pero importante RGPD |
| MEDIO | Emails HTML interpolaban nombres/empresa sin escape | HTML injection en clientes de correo | Escape HTML en helpers y variables dinamicas | Cerrado | No |
| BAJO | Descargas sensibles cacheables | Datos laborales podian quedar en caches locales/intermedias | `Cache-Control: private, no-store` en exports/GDPR/adjuntos | Cerrado | No |
| HARDENING | Produccion permitia defaults peligrosos | Deploy con secret corta, CORS `*`, memory limiter, noop email o Stripe incompleto | Validadores de produccion en `Settings` | Cerrado | Si para produccion real |
| HARDENING | Cabeceras frontend mejorables | Menor aislamiento de navegador | COOP, CORP, DNS prefetch off y cross-domain policies | Cerrado | No |

## 3. Cambios realizados

- Auth/sesion: cookies HttpOnly como unica entrega de tokens al web client,
  refresh rotation con reuse detection, CSRF por Origin/Referer en produccion.
- Autorizacion: gestion de usuarios bloquea acciones sobre roles no delegables.
- Multi-tenant: filtro de `Employee.company_id` en payroll y validacion tenant
  de `location_id` en gastos.
- Billing: return URLs confiables, webhook payload maximo, metadata Stripe
  consistente con subscription/customer almacenado e invalid plan fallback.
- Exports/GDPR: rate limits ampliados, no-store, formula injection neutralizada.
- Uploads: tamaño acotado, MIME allowlist, magic bytes, nombre seguro, extension
  segura y descarga no cacheable.
- Frontend: eliminado bearer desde `localStorage`; headers y CSP existentes
  reforzados.
- Config/operacion: produccion rechaza secretos/defaults inseguros y requiere
  Redis rate limiting, HTTPS, trusted hosts, CORS explicito, email y Stripe.
- Logs/errores/emails: menor exposicion de PII y datos sensibles.
- Iteracion 2026-05-22: scoping defensivo para usuarios `employee` sin perfil
  en gastos/retrasos/tickets, revocacion de refresh tokens al desactivar o
  cambiar password, y validaciones 422 para nombres obligatorios y updates de
  gastos.

## 4. Riesgos pendientes

- Access JWT ya emitidos siguen validos hasta expiracion corta (15 min). Para
  invalidacion inmediata completa se recomienda `session_version` o `token_iat`
  contra DB/Redis.
- No hay antivirus/sandbox de adjuntos. El riesgo se reduce con allowlist,
  magic bytes y tamaño bajo, pero produccion deberia integrar escaneo.
- GDPR esta en formato JSON y sin UI completa de self-service/deletion.
- No se hizo pentest dinamico con navegador autenticado ni pruebas DAST.
- Dependencias deben auditarse en CI con `npm audit`/Dependabot y `pip-audit`
  o equivalente.
- CSP de estilos mantiene `unsafe-inline` por dependencias actuales de mapas y
  componentes visuales. El riesgo de script inline sigue mitigado con nonce y
  `strict-dynamic`, pero queda hardening de estilos pendiente.
- Backups, retencion, DPA, politica de privacidad y terminos siguen siendo
  requisitos de produccion, especialmente por RGPD/LOPD-GDD en España.

## 5. Recomendaciones de produccion

- Usar HTTPS extremo a extremo y HSTS en dominio final.
- Configurar `CLOCKLY_SECRET_KEY` aleatorio de 32+ caracteres y rotacion de
  secretos documentada.
- `CLOCKLY_RATE_LIMIT_BACKEND=redis`, Redis privado y persistencia/monitoring.
- `CLOCKLY_FRONTEND_BASE_URL`, CORS y trusted hosts exactos del entorno.
- Mantener `CLOCKLY_TRUST_PROXY_HEADERS=false` salvo proxy gestionado que
  sobrescriba `X-Forwarded-For`.
- Activar email real; produccion rechaza `noop`.
- Stripe: secrets por entorno, webhook endpoint separado por entorno y alertas
  sobre eventos `failed`.
- Guardar adjuntos en object storage privado con URLs firmadas o proxy backend.
- Definir retencion laboral/GDPR, backups cifrados, restore testado y borrado.
- Activar Dependabot/Renovate, SAST, secret scanning y auditoria de dependencias
  en CI.

## 6. Security backlog

1. Invalidacion inmediata de access JWT con `session_version` por usuario.
2. Escaneo antivirus de adjuntos y migracion a storage privado.
3. DAST autenticado contra staging y test CSRF/browser real.
4. Tests E2E de exports, billing portal y flujos GDPR.
5. Politicas legales: privacidad, terminos, DPA, retencion, deletion workflow.
6. Alertas operativas: rate limit spikes, webhook failures, login brute force,
   export volume, admin role changes.
7. Reducir `style-src 'unsafe-inline'` cuando mapas/charts no lo requieran.
8. Cifrado por campo o tokenizacion para datos especialmente sensibles si el
   alcance laboral crece.

## 7. Validacion 2026-05-22

- `python -m compileall app tests`: OK.
- `python -m pytest tests/test_expense_tickets.py tests/test_late_arrivals.py tests/test_tickets.py tests/test_employees.py tests/test_soft_delete.py tests/test_settings.py`: no ejecuta casos por entorno. La suite intenta levantar PostgreSQL con testcontainers y Docker no esta disponible (`//./pipe/docker_engine` inexistente).
- `python -m pytest`: mismo bloqueo de entorno para tests con DB. Tests unitarios sin DB avanzan, pero la suite completa queda no validada hasta disponer de Docker Desktop o `CLOCKLY_TEST_DATABASE_URL`.
- `npm run type-check`: OK.
- `npm run lint`: OK con 4 warnings preexistentes, 0 errores.
- `npm run build`: no validado por bloqueo de filesystem/OneDrive (`EPERM` al escribir/renombrar artefactos `.next`). Reintento con `NEXT_DIST_DIR=.next-audit` tambien falla por `EPERM`; no esta relacionado con cambios de codigo backend.

## 8. Veredicto

**Razonablemente endurecida para una V1 con reservas operativas.**

No se recomienda publicar sin cerrar staging, email real, Redis de produccion,
backups/restore, legal RGPD/LOPD-GDD y auditoria de dependencias en CI. Desde el
punto de vista de codigo, se han cerrado los principales vectores explotables
en auth, RBAC, tenant isolation, exports, billing, uploads, errores y
configuracion segura por defecto. La revision del 2026-05-22 cierra ademas
gaps de permisos en usuarios `employee` sin perfil y revocacion de sesiones en
cambios sensibles.

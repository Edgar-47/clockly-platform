# ClockLy Landing SEO Improvements

## 1. Objetivo

Mejorar la landing pública de ClockLy para posicionar mejor en búsquedas de
control horario en España y convertir visitas en demos privadas o registros.

## 2. Cambios visuales

- Hero premium con fondo claro, grid sutil, CTA principal y mockup CSS del producto.
- Mockups code-native de dashboard, fichajes, kiosk con PIN, métricas y tabla operativa.
- Secciones alternadas con fondo blanco, gris suave y bloque oscuro para sectores.
- Cards con bordes sutiles, sombras ligeras, iconografía lucide y jerarquía clara.
- Footer completo con navegación, privacidad, términos, login y contacto.

## 3. Cambios SEO

- Canonical público cambiado a `https://clockly.es`.
- Title y description orientados a control horario, pymes, restaurantes y comercios.
- Robots y sitemap actualizados para landing, registro, privacidad y términos.
- FAQ SEO ampliada con preguntas reales de búsqueda.
- Headings ordenados con un único H1.

## 4. Secciones añadidas

- Problemas: papel, Excel, retrasos, revisiones manuales y exceso de complejidad.
- Solución ClockLy: fichaje digital, empleados, centros y exportaciones.
- Funcionalidades: fichajes, kiosk, empleados, centros, retrasos, tickets, salarios
  estimados, exportaciones, roles, geolocalización puntual y dashboard.
- Sectores: restaurantes, peluquerías, clínicas, gimnasios, talleres, comercios y
  pequeñas empresas por turnos.
- Registro horario en España con lenguaje prudente.
- Cómo funciona en cuatro pasos.
- Product preview y planes.
- CTA final.

## 5. FAQ añadida

Se añadieron 14 preguntas frecuentes sobre ClockLy, software de control horario,
restaurantes, móvil, PIN, geolocalización, exportaciones, asesoría laboral,
centros de trabajo, Excel, prueba gratis, pequeñas empresas y datos de empleados.

## 6. Metadata y structured data

- Metadata: title, description, keywords, canonical, robots, OpenGraph y Twitter Card.
- JSON-LD: `SoftwareApplication`, `Organization`, `WebSite` y `FAQPage`.
- No se añadieron reviews, estrellas ni precios inventados.

## 7. Validación local

- `npm run type-check`: OK.
- `npm run lint`: OK.
- `NEXT_DIST_DIR=.next-rc npm run build`: bloqueado en Windows/OneDrive por
  `EPERM` al renombrar un manifest de Turbopack.
- Build alternativo validado: `NEXT_DIST_DIR=.next-rc-webpack npx next build --webpack`: OK.
- Rutas locales validadas con 200: `/`, `/privacy`, `/terms`, `/login`,
  `/register-company`, `/forgot-password`.
- Browser QA local: desktop 1280, mobile 390/360 y tablet 768 sin overflow horizontal
  ni errores de consola relevantes.
- E2E completo no ejecutado: el backend local no estaba disponible y las suites
  autenticadas dependen de `E2E_OWNER_PASSWORD`.

## 8. Deploy

- Deploy final ejecutado con `flyctl deploy --app clockly-app`.
- Build remoto en Fly: OK, incluyendo `/api/plans`, `/privacy` y `/terms`.
- Se ajustó el Dockerfile para mantener `API_URL_INTERNAL` y `NEXT_PUBLIC_API_URL`
  también en runtime del standalone server.

## 9. Smoke post-deploy

- `https://clockly.es`: 200 OK.
- `https://www.clockly.es`: 200 OK.
- `https://app.clockly.es`: 200 OK.
- `https://clockly.es/api/plans`: 200 OK.
- `GET https://clockly.es/api/plans`: 200 OK con `X-ClockLy-Plans-Source: fallback`
  porque `https://api.clockly.es` no respondió durante la validación externa.
- `/privacy`, `/terms`, `/login`, `/register-company` y `/forgot-password`: 200 OK.

## 10. Riesgos pendientes

- El backend público `https://api.clockly.es` no respondió durante el smoke directo;
  la landing mantiene planes visibles mediante fallback frontend.
- Las páginas `/privacy` y `/terms` son textos provisionales y deben revisarse
  profesionalmente antes de clientes reales.
- El aviso de Next sobre `middleware` indica migración futura a `proxy`.
- Pendiente auditoría Lighthouse completa.

## 11. Próximos pasos SEO

- Google Search Console.
- `sitemap.xml`.
- `robots.txt`.
- Indexación de `clockly.es`.
- Página específica “control horario restaurantes”.
- Página específica “control horario peluquerías”.
- Página específica “software control horario pymes”.
- Blog educativo.
- Optimización Lighthouse.

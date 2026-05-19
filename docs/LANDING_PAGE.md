# ClockLy Landing Comercial

## Objetivo

La landing pública de ClockLy vive en `frontend-next/app/page.tsx` y vende el
producto real: software de control horario y gestión de empleados para pymes
españolas, restaurantes, comercios, clínicas, gimnasios, talleres y negocios
con equipos por turnos.

El enfoque comercial es convertir visitas en demos privadas y registros sin
prometer cumplimiento legal absoluto ni funcionalidades que no estén
implementadas.

## Estructura

- Header con logo, navegación interna, login y CTA de registro.
- Hero claro con propuesta principal, tres CTAs y mockup HTML/CSS del producto.
- Sección de problemas: papel, Excel, retrasos, registros difíciles y exceso de complejidad.
- Sección de solución: fichaje digital, empleados, centros y exportaciones.
- Grid de funcionalidades con fichajes, kiosk PIN, empleados, centros, retrasos,
  tickets, salarios estimados, exportaciones, roles, geolocalización puntual y dashboard.
- Sección de sectores SEO: restaurantes, peluquerías, clínicas, gimnasios,
  talleres, comercios y pequeñas empresas por turnos.
- Sección educativa de registro horario en España con lenguaje prudente.
- Cómo funciona en cuatro pasos.
- Product preview construido con CSS, sin imágenes externas.
- Planes públicos consultando `/api/plans` con fallback comercial.
- FAQ SEO amplia.
- CTA final.
- Footer completo con privacidad, términos, login y contacto.

## SEO aplicado

- Title: `ClockLy | Control horario y gestión de empleados para pymes`.
- Description orientada a control horario, fichaje digital, empleados, centros,
  retrasos, gastos y exportaciones.
- Canonical: `https://clockly.es`.
- Open Graph y Twitter Card con imagen dinámica en `app/opengraph-image.tsx`.
- JSON-LD `SoftwareApplication`, `Organization`, `WebSite` y `FAQPage`.
- `app/robots.ts` permite landing, registro, login, privacidad y términos, y
  desaconseja rutas privadas.
- `app/sitemap.ts` incluye landing, registro, privacidad y términos.
- `next.config.ts` añade `X-Robots-Tag: noindex, nofollow` en rutas privadas
  durante producción.

## CTAs y rutas

- Demo privada: `mailto:clockly.contact@gmail.com`.
- Registro: `https://app.clockly.es/register-company`.
- Login: `https://app.clockly.es/login`.
- Anclas internas: `#funcionalidades`, `#sectores`, `#registro-horario`,
  `#como-funciona`, `#planes`, `#faq`.
- Privacidad: `/privacy`.
- Términos: `/terms`.

No usar `localhost` ni enlaces `#` sin sección real en CTAs de producción.

## Cómo modificar textos

El copy principal y las secciones están definidos como constantes dentro de
`frontend-next/app/page.tsx`:

- `trustIndicators`
- `painPoints`
- `solutionItems`
- `featureCards`
- `industries`
- `workflowSteps`
- `faqs`
- `structuredData`

Antes de añadir una promesa comercial, comprobar que la funcionalidad existe en
`backend_v2/app`, `frontend-next/app` o documentación actualizada.

## Cómo actualizar planes

La landing usa `frontend-next/components/landing/landing-plan-cards.tsx`, que
consulta `/api/plans` mediante `usePlans()`. La ruta
`frontend-next/app/api/plans/route.ts` intenta leer el backend público y, si no
responde, devuelve fallback para Free, Pro y Business con la cabecera
`X-ClockLy-Plans-Source: fallback`.

No inventar precios desde Stripe Price IDs. Si se publican precios reales,
actualizar:

- Backend de planes.
- Copy comercial del componente de planes.
- JSON-LD si se decide añadir `offers`.
- `docs/LANDING_PAGE.md`.
- Cualquier copy de `/upgrade` si corresponde.

## Cómo cambiar screenshots o mockups

Los mockups actuales son HTML/CSS dentro de:

- `HeroMockup`
- `ProductPreview`

Son deliberadamente code-native para no mostrar capturas falsas ni cargar
imágenes externas. Si se sustituyen por screenshots reales, validar que no
exponen datos sensibles y que representan el estado actual del producto.

## Checklist antes de publicar

- [ ] Landing actualizada.
- [ ] CTAs apuntan a `app.clockly.es` y al email correcto.
- [ ] Metadata SEO revisada.
- [ ] Open Graph renderiza correctamente.
- [ ] JSON-LD no contiene reviews, clientes ni métricas inventadas.
- [ ] Sitemap no incluye rutas privadas.
- [ ] Robots y `X-Robots-Tag` protegen superficies privadas.
- [ ] `/privacy` y `/terms` siguen visibles sin sesión.
- [ ] `npm run type-check` OK.
- [ ] `npm run lint` OK.
- [ ] `npm run build` OK.
- [ ] Revisión responsive desktop, tablet y móvil.
- [ ] Lighthouse recomendado: Performance, Accessibility, Best Practices y SEO.
- [ ] Páginas legales pendientes no se presentan como definitivas.

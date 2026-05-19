# ClockLy Landing Comercial

## Objetivo

La landing pública de ClockLy vive en `frontend-next/app/page.tsx` y vende el
producto real: control horario sencillo para pequeñas empresas, con empleados,
fichajes, sesiones, modo kiosk con PIN y planes Free, Pro y Business.

El enfoque comercial es convertir visitas en registros sin prometer cumplimiento
legal absoluto ni funcionalidades que no estén implementadas.

## Estructura

- Header con logo, navegación interna, acceso a login y CTA de registro.
- Hero con propuesta principal, CTAs y mockup HTML/CSS del producto.
- Bloques de valor: fichajes con PIN, kiosk, empleados, sesiones y planes.
- Sección para negocios locales: restaurantes, barberías, estética, clínicas,
  gimnasios y talleres.
- Cómo funciona en cinco pasos.
- Sección de producto con dashboard mockup basado en la app real.
- Precios con límites reales del backend.
- Confianza y seguridad explicadas en lenguaje comercial.
- FAQ SEO.
- CTA final.
- Footer con enlaces públicos reales.

## SEO aplicado

- Title: `ClockLy | Control horario simple para pequeñas empresas`.
- Description orientada a control horario, empleados, fichajes, sesiones y kiosk.
- Canonical: `https://app.clockly.es`.
- Open Graph y Twitter Card con imagen dinámica en `app/opengraph-image.tsx`.
- JSON-LD `WebApplication` y `FAQPage`.
- `app/robots.ts` permite la landing y desaconseja rutas privadas.
- `app/sitemap.ts` incluye la landing y el alta pública de empresa.
- `next.config.ts` añade `X-Robots-Tag: noindex, nofollow` en rutas privadas
  durante producción.

## CTAs y rutas

- Registro: `https://app.clockly.es/register-company`.
- Login: `https://app.clockly.es/login`.
- Anclas internas: `#funciones`, `#como-funciona`, `#precios`, `#faq`.

No usar `localhost` ni enlaces `#` sin sección real en CTAs de producción.

## Cómo modificar textos

El copy principal y las secciones están definidos como constantes dentro de
`frontend-next/app/page.tsx`:

- `proofPoints`
- `businessTypes`
- `steps`
- `features`
- `pricingPlans`
- `securityItems`
- `faqs`

Antes de añadir una promesa comercial, comprobar que la funcionalidad existe en
`backend_v2/app`, `frontend-next/app` o documentación actualizada.

## Cómo actualizar precios y planes

Los límites actuales salen de `backend_v2/app/services/plans.py`:

- Free: hasta 5 empleados.
- Pro: hasta 30 empleados.
- Business: empleados ilimitados.

Si se añaden precios públicos reales, actualizar:

- `pricingPlans` en `frontend-next/app/page.tsx`.
- JSON-LD `offers` en la misma página.
- `docs/LANDING_PAGE.md`.
- Cualquier copy de `/upgrade` si corresponde.

No inventar precios desde Stripe Price IDs. Un Price ID no es un importe público.

## Cómo cambiar screenshots o mockups

Los mockups actuales son HTML/CSS dentro de:

- `HeroProductScene`
- Sección “Todo claro desde un único panel”

Son deliberadamente code-native para no mostrar capturas falsas. Si se sustituyen
por screenshots reales, validar que no exponen datos sensibles y que representan
el estado actual del producto.

## Checklist antes de publicar

- [ ] Landing actualizada.
- [ ] CTAs apuntan a `app.clockly.es`.
- [ ] Metadata SEO revisada.
- [ ] Open Graph renderiza correctamente.
- [ ] JSON-LD no contiene reviews, clientes ni métricas inventadas.
- [ ] Sitemap no incluye rutas privadas.
- [ ] Robots y `X-Robots-Tag` protegen superficies privadas.
- [ ] `npm run type-check` OK.
- [ ] `npm run lint` OK.
- [ ] `npm run build` OK.
- [ ] Revisión responsive desktop y móvil.
- [ ] Lighthouse recomendado: Performance, Accessibility, Best Practices y SEO.
- [ ] Páginas legales pendientes no se presentan como definitivas.

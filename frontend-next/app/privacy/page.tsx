import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — ClockLy",
  description: "Información sobre el tratamiento de datos personales en ClockLy.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary hover:underline">← Volver al inicio</Link>
        </div>

        <h1 className="text-3xl font-bold text-ink mb-2">Política de Privacidad</h1>
        <p className="text-sm text-ink-muted mb-8">
          Última actualización: mayo 2026 ·{" "}
          <span className="italic text-amber-600 font-medium">
            Pendiente de revisión legal profesional antes de lanzamiento público
          </span>
        </p>

        <div className="prose prose-sm max-w-none space-y-8 text-ink-muted">

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de los datos personales recogidos a través de la plataforma ClockLy es{" "}
              <strong>ClockLy</strong> (en adelante, &ldquo;ClockLy&rdquo;, &ldquo;nosotros&rdquo;). Los datos de contacto del responsable
              pueden obtenerse escribiendo a <strong>legal@clockly.es</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">2. Datos que tratamos</h2>
            <p>ClockLy trata las siguientes categorías de datos:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Datos de identificación</strong>: nombre completo, dirección de correo electrónico, DNI/NIE (si se proporciona).</li>
              <li><strong>Datos de registro de jornada laboral</strong>: marcajes de entrada y salida, ubicación en el momento del fichaje (solo si el empleado da su consentimiento explícito).</li>
              <li><strong>Datos de la empresa</strong>: nombre, CIF, sector y configuración operativa.</li>
              <li><strong>Datos de uso</strong>: logs de acceso, acciones realizadas dentro de la plataforma (registros de auditoría internos, sin comercialización).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">3. Finalidad del tratamiento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Prestación del servicio de control horario y gestión de empleados.</li>
              <li>Cumplimiento de las obligaciones legales relativas al registro de jornada (art. 34.9 ET y normativa laboral española).</li>
              <li>Gestión de la relación contractual con el cliente (empresa usuaria).</li>
              <li>Comunicaciones relacionadas con el servicio (notificaciones, invitaciones, resets de contraseña).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">4. Base jurídica</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Ejecución de un contrato</strong> (art. 6.1.b RGPD): para la prestación del servicio contratado.</li>
              <li><strong>Cumplimiento de obligación legal</strong> (art. 6.1.c RGPD): registro de jornada laboral exigido por la normativa española.</li>
              <li><strong>Consentimiento</strong> (art. 6.1.a RGPD): para el tratamiento de datos de geolocalización en el momento del fichaje. El empleado puede revocar este consentimiento en cualquier momento.</li>
              <li><strong>Interés legítimo</strong> (art. 6.1.f RGPD): para el registro de eventos de seguridad y auditoría interna.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">5. Geolocalización</h2>
            <p>
              ClockLy puede registrar las coordenadas GPS del dispositivo en el momento del fichaje
              <strong> únicamente si el empleado otorga su consentimiento explícito</strong>. No se realiza
              seguimiento de ubicación continuo. Los datos de localización se usan exclusivamente para
              verificar que el fichaje se realiza desde un centro de trabajo autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">6. Destinatarios y subencargados</h2>
            <p>Los datos pueden ser comunicados a los siguientes subencargados del tratamiento:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Fly.io</strong> (infraestructura cloud, servidores en EU).</li>
              <li><strong>Neon</strong> (base de datos PostgreSQL gestionada).</li>
              <li><strong>Cloudflare R2</strong> (almacenamiento de adjuntos).</li>
              <li><strong>Resend</strong> (envío de emails transaccionales).</li>
              <li><strong>Stripe</strong> (procesamiento de pagos, si aplicable).</li>
              <li><strong>Sentry</strong> (monitorización de errores, datos de uso anonimizados).</li>
            </ul>
            <p className="mt-2">
              Todos los subencargados ofrecen garantías adecuadas conforme al RGPD (cláusulas contractuales tipo o decisión de adecuación).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">7. Conservación de los datos</h2>
            <p>
              Los registros de jornada laboral se conservan durante el periodo mínimo exigido por la normativa
              laboral española (mínimo 4 años según el art. 34.9 ET). Los datos de cuenta se conservan mientras
              la relación contractual esté vigente y, posteriormente, durante los plazos de prescripción aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">8. Derechos de los interesados</h2>
            <p>Los empleados y usuarios de ClockLy tienen derecho a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Acceso</strong>: obtener confirmación de si se tratan sus datos y una copia de los mismos.</li>
              <li><strong>Rectificación</strong>: corregir datos inexactos.</li>
              <li><strong>Supresión</strong>: solicitar la eliminación de sus datos, salvo que exista obligación legal de conservarlos.</li>
              <li><strong>Oposición y limitación</strong>: oponerse al tratamiento o limitar su alcance en determinadas circunstancias.</li>
              <li><strong>Portabilidad</strong>: recibir sus datos en formato estructurado y de uso común.</li>
              <li><strong>Retirar el consentimiento</strong>: cuando el tratamiento se base en el consentimiento (p. ej., geolocalización).</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, contacta con <strong>legal@clockly.es</strong>. También tienes derecho a
              presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en{" "}
              <a href="https://www.aepd.es" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                www.aepd.es
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">9. Seguridad</h2>
            <p>
              ClockLy implementa medidas técnicas y organizativas adecuadas para proteger los datos: cifrado en tránsito (HTTPS/TLS),
              cookies de sesión HttpOnly y Secure, control de acceso basado en roles, auditoría de eventos y almacenamiento
              cifrado de credenciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">10. Contacto</h2>
            <p>
              Para cualquier consulta sobre el tratamiento de tus datos, contacta con nosotros en{" "}
              <strong>legal@clockly.es</strong>.
            </p>
          </section>

          <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <strong>Nota:</strong> Este documento es un borrador provisional. Debe ser revisado y validado por un asesor legal especializado en protección de datos antes de su publicación definitiva y uso con clientes reales.
          </div>
        </div>
      </div>
    </div>
  );
}

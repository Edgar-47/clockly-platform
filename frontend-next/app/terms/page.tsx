import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — ClockLy",
  description: "Condiciones generales de uso y contratación del servicio ClockLy.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary hover:underline">← Volver al inicio</Link>
        </div>

        <h1 className="text-3xl font-bold text-ink mb-2">Términos y Condiciones</h1>
        <p className="text-sm text-ink-muted mb-8">
          Última actualización: mayo 2026 ·{" "}
          <span className="italic text-amber-600 font-medium">
            Pendiente de revisión legal profesional antes de lanzamiento público
          </span>
        </p>

        <div className="prose prose-sm max-w-none space-y-8 text-ink-muted">

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">1. Objeto y ámbito de aplicación</h2>
            <p>
              Los presentes Términos y Condiciones (en adelante, &ldquo;Términos&rdquo;) regulan el acceso y uso de la
              plataforma ClockLy (en adelante, &ldquo;el Servicio&rdquo;), titularidad de <strong>ClockLy</strong>,
              accesible en <strong>app.clockly.es</strong> y su API asociada en <strong>api.clockly.es</strong>.
            </p>
            <p className="mt-2">
              Al registrar una empresa o acceder al Servicio como empleado, el usuario acepta quedar vinculado
              por estos Términos. Si actúas en nombre de una empresa, declaras tener autoridad para vincular
              a dicha empresa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">2. Descripción del Servicio</h2>
            <p>ClockLy es una plataforma SaaS de control horario y gestión de empleados que ofrece:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Registro de jornada laboral (fichajes de entrada y salida) conforme al art. 34.9 ET.</li>
              <li>Gestión de empleados, roles y permisos.</li>
              <li>Seguimiento de ausencias, incidencias y retrasos.</li>
              <li>Generación de informes y exportación de datos.</li>
              <li>Gestión de tickets de gastos y justificantes.</li>
              <li>Geolocalización opcional en el momento del fichaje (con consentimiento del empleado).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">3. Registro y cuenta</h2>
            <p>
              Para utilizar el Servicio, la empresa debe registrarse proporcionando información veraz y
              actualizada. El titular de la cuenta (&ldquo;Owner&rdquo;) es responsable de mantener la confidencialidad
              de las credenciales de acceso y de todas las acciones realizadas bajo su cuenta.
            </p>
            <p className="mt-2">
              ClockLy se reserva el derecho de suspender o cancelar cuentas que incumplan estos Términos,
              proporcionen información falsa o realicen un uso fraudulento del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">4. Planes y precios</h2>
            <p>El Servicio se ofrece bajo los siguientes planes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>FREE</strong>: hasta 5 empleados activos, funcionalidades básicas de control horario.</li>
              <li><strong>PRO</strong>: hasta 30 empleados activos, funcionalidades avanzadas de gestión.</li>
              <li><strong>BUSINESS</strong>: empleados ilimitados, todas las funcionalidades disponibles.</li>
            </ul>
            <p className="mt-2">
              Los precios y funcionalidades específicas de cada plan están disponibles en la página de precios.
              ClockLy se reserva el derecho de modificar los precios con un preaviso mínimo de 30 días.
              Los cambios no afectarán a los periodos ya facturados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">5. Facturación y pagos</h2>
            <p>
              Los planes de pago se facturan de forma mensual o anual a través de <strong>Stripe</strong>.
              Al suscribirse a un plan de pago, el usuario autoriza a ClockLy a cargar el importe
              correspondiente en el método de pago facilitado de forma recurrente.
            </p>
            <p className="mt-2">
              En caso de impago, ClockLy podrá suspender el acceso al Servicio hasta la regularización
              del pago. El usuario podrá cancelar su suscripción en cualquier momento desde el panel de
              administración; la cancelación surtirá efecto al final del periodo de facturación en curso.
            </p>
            <p className="mt-2">
              No se realizan reembolsos por periodos parciales, salvo obligación legal expresa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">6. Uso aceptable</h2>
            <p>El usuario se compromete a no utilizar el Servicio para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Actividades ilegales o contrarias a la normativa laboral española y europea.</li>
              <li>Registro fraudulento de jornada laboral (fichajes falsos o manipulados).</li>
              <li>Acceso no autorizado a datos de otros tenants o empresas.</li>
              <li>Introducir malware, realizar ataques de denegación de servicio o vulnerar la seguridad del sistema.</li>
              <li>Revender o sublicenciar el acceso al Servicio a terceros sin autorización expresa.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">7. Responsabilidades del cliente (empresa)</h2>
            <p>La empresa usuaria es responsable de:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Obtener el consentimiento de los empleados para el tratamiento de sus datos, incluida la geolocalización si se activa.</li>
              <li>Informar a los empleados sobre el uso de la herramienta conforme a la normativa laboral y de protección de datos.</li>
              <li>Verificar que el uso del Servicio cumple con el convenio colectivo aplicable y la legislación vigente.</li>
              <li>Mantener la exactitud de los datos introducidos en la plataforma.</li>
            </ul>
            <p className="mt-2">
              ClockLy actúa como <strong>encargado del tratamiento</strong> en los términos del RGPD, siendo
              la empresa usuaria el responsable del tratamiento de los datos de sus empleados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">8. Propiedad intelectual</h2>
            <p>
              Todo el software, diseño, marcas y contenidos de ClockLy son propiedad exclusiva de ClockLy
              o de sus licenciantes. El uso del Servicio no otorga al usuario ningún derecho de propiedad
              intelectual sobre los mismos.
            </p>
            <p className="mt-2">
              Los datos introducidos por la empresa (fichajes, empleados, configuración) son propiedad de
              la empresa. ClockLy los trata únicamente para la prestación del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">9. Disponibilidad y SLA</h2>
            <p>
              ClockLy se compromete a ofrecer el Servicio con un nivel de disponibilidad objetivo del
              <strong> 99,5% mensual</strong>, excluyendo mantenimientos programados (notificados con al menos
              24 horas de antelación) y circunstancias ajenas al control razonable de ClockLy (fuerza mayor,
              fallos de infraestructura de terceros).
            </p>
            <p className="mt-2">
              ClockLy no garantiza que el Servicio esté libre de errores o interrupciones en todo momento.
              En caso de incidencia, se puede contactar con soporte en <strong>soporte@clockly.es</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">10. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley aplicable, ClockLy no será responsable de daños
              indirectos, incidentales, especiales, punitivos o consecuentes derivados del uso o la
              imposibilidad de uso del Servicio.
            </p>
            <p className="mt-2">
              La responsabilidad total de ClockLy frente al cliente no superará, en ningún caso, el importe
              facturado durante los <strong>tres meses anteriores</strong> al evento que dio origen a la
              reclamación.
            </p>
            <p className="mt-2">
              ClockLy no es responsable del incumplimiento de obligaciones legales de registro de jornada
              por parte de la empresa usuaria, ni de sanciones administrativas derivadas de un uso incorrecto
              del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">11. Protección de datos</h2>
            <p>
              El tratamiento de datos personales en el contexto del Servicio se rige por la{" "}
              <Link href="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>{" "}
              de ClockLy y, en su caso, por el Acuerdo de Tratamiento de Datos (DPA) suscrito con la
              empresa usuaria. La empresa y ClockLy formalizarán un DPA conforme al art. 28 RGPD antes
              del inicio del tratamiento de datos de empleados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">12. Modificación de los Términos</h2>
            <p>
              ClockLy podrá modificar estos Términos notificando al usuario con un mínimo de <strong>30 días
              de antelación</strong> por correo electrónico o mediante aviso destacado en la plataforma.
              El uso continuado del Servicio tras dicho plazo implicará la aceptación de los nuevos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">13. Resolución del contrato y portabilidad</h2>
            <p>
              Cualquiera de las partes puede resolver la relación contractual con un preaviso de 30 días.
              Tras la cancelación, la empresa podrá solicitar la exportación de sus datos (fichajes, empleados)
              en formato CSV durante un plazo de <strong>30 días</strong>. Transcurrido dicho plazo, los datos
              serán eliminados de los sistemas activos, manteniéndose únicamente los registros que la
              normativa exija conservar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">14. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por la legislación española. Para cualquier controversia derivada
              de su interpretación o ejecución, las partes se someten a los Juzgados y Tribunales de
              <strong> Barcelona</strong>, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">15. Contacto</h2>
            <p>
              Para cualquier consulta sobre estos Términos, contacta con nosotros en{" "}
              <strong>legal@clockly.es</strong>.
            </p>
          </section>

          <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <strong>Nota:</strong> Este documento es un borrador provisional. Debe ser revisado y validado por un asesor legal especializado antes de su publicación definitiva y uso con clientes reales. En particular, las cláusulas de limitación de responsabilidad, el DPA y los apartados de jurisdicción requieren revisión por abogado colegiado.
          </div>
        </div>
      </div>
    </div>
  );
}

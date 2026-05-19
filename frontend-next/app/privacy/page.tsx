import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Privacidad | ClockLy",
  description:
    "Información de privacidad de ClockLy pendiente de revisión profesional. Consulta qué datos operativos puede tratar la plataforma de control horario.",
  alternates: {
    canonical: "https://clockly.es/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  {
    title: "Estado del documento",
    text: "Esta página es una referencia informativa provisional y debe revisarse profesionalmente antes de utilizar ClockLy con clientes reales o plantillas en producción.",
  },
  {
    title: "Datos operativos",
    text: "ClockLy puede tratar datos de empresa, usuarios, empleados, fichajes, sesiones, incidencias, tickets, centros de trabajo y configuración necesaria para prestar el servicio.",
  },
  {
    title: "Geolocalización puntual",
    text: "Cuando la función está habilitada y el navegador lo autoriza, ClockLy puede guardar ubicación puntual asociada al momento del fichaje. No está diseñada como rastreo continuo.",
  },
  {
    title: "Finalidad",
    text: "Los datos se usan para facilitar el registro horario, la gestión de empleados, la revisión interna de jornadas y la exportación de información operativa.",
  },
  {
    title: "Contacto",
    text: "Para consultas relacionadas con privacidad, escribe a clockly.contact@gmail.com.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface-bg px-5 py-10 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          aria-label="Volver a ClockLy"
          className="inline-flex rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Logo size="sm" />
        </Link>

        <section className="mt-10 rounded-[8px] border border-border bg-white p-6 shadow-xs sm:p-8">
          <h1 className="text-3xl font-bold tracking-normal text-ink sm:text-4xl">
            Privacidad
          </h1>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            Información orientativa sobre privacidad en ClockLy. No constituye asesoramiento
            legal ni una política definitiva.
          </p>

          <div className="mt-8 space-y-6">
            {sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-lg font-bold tracking-normal text-ink">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{section.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/" className="text-primary hover:underline">
              Volver al inicio
            </Link>
            <Link href="/terms" className="text-primary hover:underline">
              Ver términos
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

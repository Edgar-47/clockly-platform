import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Términos | ClockLy",
  description:
    "Condiciones informativas provisionales de ClockLy, software de control horario y gestión de empleados para pymes.",
  alternates: {
    canonical: "https://clockly.es/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  {
    title: "Estado del documento",
    text: "Estos términos son una base informativa provisional. Deben revisarse por un profesional antes de convertirse en condiciones legales definitivas.",
  },
  {
    title: "Servicio",
    text: "ClockLy es una plataforma web para facilitar control horario, fichaje digital, gestión de empleados, centros de trabajo, incidencias y exportaciones operativas.",
  },
  {
    title: "Uso responsable",
    text: "La empresa usuaria debe configurar la herramienta de forma adecuada, revisar sus registros y validar con su asesoría las obligaciones laborales aplicables.",
  },
  {
    title: "Limitaciones",
    text: "ClockLy ayuda a organizar información de jornada, pero no sustituye asesoramiento laboral, fiscal, contable ni jurídico.",
  },
  {
    title: "Contacto",
    text: "Para dudas sobre el servicio o una demo privada, escribe a clockly.contact@gmail.com.",
  },
];

export default function TermsPage() {
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
            Términos
          </h1>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            Condiciones orientativas sobre el uso de ClockLy. No son textos legales
            definitivos ni sustituyen revisión profesional.
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
            <Link href="/privacy" className="text-primary hover:underline">
              Ver privacidad
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

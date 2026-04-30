import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Programa de Afiliados · ClockLy",
  description:
    "Recomienda ClockLy a tus clientes y cobra una comisión recurrente mensual. Ideal para gestorías y asesorías.",
};

const STEPS = [
  {
    number: "01",
    title: "Solicita acceso",
    description: "Rellena el formulario con tus datos de contacto y recibirás tu código único en 24h.",
  },
  {
    number: "02",
    title: "Comparte con tus clientes",
    description: "Envía tu enlace personalizado a empresas que necesiten control horario.",
  },
  {
    number: "03",
    title: "Cobra cada mes",
    description: "Gana el 20% de la cuota mensual por cada cliente activo que refieras.",
  },
];

const BENEFITS = [
  { title: "Comisión recurrente", description: "20% mensual mientras el cliente esté activo." },
  { title: "Sin límite de referidos", description: "Cuantos más clientes, mayores ingresos." },
  { title: "Panel de seguimiento", description: "Ve en tiempo real tus clientes y comisiones." },
  { title: "Soporte prioritario", description: "Acceso directo al equipo de ClockLy." },
];

export default function PartnerPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
            Programa de Afiliados
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Gana mientras ayudas a tus clientes
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Conviértete en partner de ClockLy y recibe una comisión mensual recurrente por cada
            empresa que refieras. Perfecto para gestorías, asesorías laborales y consultoras.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="mailto:partners@clockly.app?subject=Solicitud%20Programa%20Afiliados"
              className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-700"
            >
              Quiero ser partner
            </a>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Conocer ClockLy
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            ¿Cómo funciona?
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-slate-900">Beneficios del programa</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">{benefit.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-bold text-slate-900">¿Listo para empezar?</h2>
          <p className="mt-3 text-slate-500">
            Escríbenos a{" "}
            <a href="mailto:partners@clockly.app" className="text-blue-600 underline">
              partners@clockly.app
            </a>{" "}
            o usa el botón de abajo. Respondemos en menos de 24 horas.
          </p>
          <a
            href="mailto:partners@clockly.app?subject=Solicitud%20Programa%20Afiliados"
            className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-700"
          >
            Solicitar acceso al programa
          </a>
        </div>
      </section>
    </main>
  );
}

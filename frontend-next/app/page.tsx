import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { PlanCards } from "@/components/shared/plan-cards";

const BENEFITS = [
  {
    icon: Clock,
    title: "Fichaje sin fricción",
    description:
      "Kiosk con PIN y panel web para registrar jornadas sin depender de procesos manuales.",
  },
  {
    icon: Users,
    title: "Gestión de equipos",
    description:
      "Alta, edición y seguimiento de empleados desde un panel centralizado.",
  },
  {
    icon: BarChart3,
    title: "Informes claros",
    description:
      "Visibilidad de asistencia, horas registradas e incidencias desde el mismo producto.",
  },
  {
    icon: Shield,
    title: "Acceso controlado",
    description:
      "Roles diferenciados y sesión centralizada para que cada usuario vea solo lo que le corresponde.",
  },
  {
    icon: Smartphone,
    title: "Preparado para tablet",
    description:
      "El kiosk está pensado para un dispositivo compartido abierto desde el panel de administración.",
  },
];

const USE_CASES = [
  "Restaurantes y hostelería",
  "Centros de estética",
  "Peluquerías",
  "Gimnasios y fitness",
  "Fisioterapia y salud",
  "Comercio y retail",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Acceso admin
            </Link>
            <Link
              href="#planes"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-ink px-6 py-24 sm:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
            Control horario profesional
          </div>
          <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Gestiona tu equipo
            <br />
            <span className="text-primary">sin complicaciones</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-white/60">
            ClockLy unifica administración, fichaje, kiosk e incidencias en una
            sola base operativa para negocios locales.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              Acceder al panel
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#planes"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-surface-bg px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              Todo lo que necesitas
            </h2>
            <p className="mt-3 text-lg text-ink-muted">
              Herramientas claras para negocios que valoran su tiempo.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-white p-6 shadow-xs transition-shadow hover:shadow"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-bold text-ink">{title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              Planes para cada etapa
            </h2>
            <p className="mt-3 text-lg text-ink-muted">
              Entitlements y límites reales expuestos por backend, sin CTAs ficticias en la interfaz.
            </p>
          </div>
          <PlanCards />
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-ink">
                Hecho para tu tipo de negocio
              </h2>
              <p className="mt-4 text-lg text-ink-muted">
                ClockLy se adapta a equipos de 2 a 50 personas que necesitan control horario y operativa sin burocracia.
              </p>
              <ul className="mt-8 space-y-3">
                {USE_CASES.map((useCase) => (
                  <li key={useCase} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
                    <span className="font-medium text-ink-soft">{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl bg-ink p-8">
              <div className="absolute -top-3 -right-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow">
                Vista previa
              </div>
              <div className="space-y-3">
                {["Recepción", "Caja", "Equipo A", "Equipo B"].map((name, index) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {name[0]}
                    </div>
                    <span className="flex-1 text-sm font-medium text-white">
                      {name}
                    </span>
                    <span
                      className={
                        index < 3
                          ? "text-xs font-semibold text-success"
                          : "text-xs font-semibold text-white/40"
                      }
                    >
                      {index < 3 ? "Ejemplo activo" : "Ejemplo libre"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Empieza hoy mismo
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Accede al panel y trabaja sobre una base coherente de empleados, asistencia e incidencias.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-white/90"
          >
            Acceder al panel
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-ink-xmuted">
            © {new Date().getFullYear()} ClockLy
          </p>
        </div>
      </footer>
    </div>
  );
}

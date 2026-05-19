import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  MonitorSmartphone,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";

const SITE_URL = "https://app.clockly.es";
const REGISTER_URL = `${SITE_URL}/register-company`;
const LOGIN_URL = `${SITE_URL}/login`;

export const metadata: Metadata = {
  title: "ClockLy | Control horario simple para pequeñas empresas",
  description:
    "Software de control horario para restaurantes, barberías, centros y negocios locales. Gestiona empleados, fichajes, sesiones y modo kiosk con PIN desde una plataforma sencilla.",
  keywords: [
    "control horario",
    "software control horario",
    "fichaje empleados",
    "registro horario",
    "control de jornada",
    "modo kiosk",
    "fichaje con PIN",
    "software para restaurantes",
    "software para barberías",
    "gestión de empleados",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "ClockLy | Control horario simple para pequeñas empresas",
    description:
      "Gestiona empleados, fichajes, sesiones y modo kiosk con PIN desde una plataforma sencilla para negocios locales.",
    url: SITE_URL,
    siteName: "ClockLy",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "ClockLy, software de control horario para pequeñas empresas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClockLy | Control horario simple para pequeñas empresas",
    description:
      "Control horario, empleados y fichajes con PIN para restaurantes, barberías y negocios locales.",
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const proofPoints = [
  {
    icon: KeyRound,
    title: "Fichajes con PIN",
    text: "Cada empleado puede registrar entrada y salida con un PIN validado de forma segura.",
  },
  {
    icon: MonitorSmartphone,
    title: "Modo kiosk",
    text: "Un punto de fichaje compartido, protegido por sesión admin y pensado para tablet o mostrador.",
  },
  {
    icon: UsersRound,
    title: "Empleados organizados",
    text: "Alta, edición y seguimiento de empleados desde un panel sencillo.",
  },
  {
    icon: BarChart3,
    title: "Sesiones claras",
    text: "Consulta jornadas, entradas, salidas e histórico de fichajes en un solo lugar.",
  },
  {
    icon: CreditCard,
    title: "Planes para crecer",
    text: "Free, Pro y Business preparados para equipos pequeños y negocios en expansión.",
  },
];

const businessTypes = [
  { title: "Restaurantes", detail: "Turnos, sala, cocina y equipos que fichan rápido." },
  { title: "Barberías", detail: "Control simple para equipos con agenda muy movida." },
  { title: "Centros de estética", detail: "Fichajes claros para cabinas, recepción y especialistas." },
  { title: "Clínicas", detail: "Equipo organizado y acceso protegido al panel." },
  { title: "Gimnasios", detail: "Entrada y salida del equipo desde kiosk o panel." },
  { title: "Talleres", detail: "Jornadas registradas sin hojas sueltas ni dudas al cierre." },
];

const steps = [
  {
    title: "Crea tu empresa",
    text: "Registra el negocio, la persona responsable y el plan inicial.",
  },
  {
    title: "Añade empleados",
    text: "Organiza el equipo y configura sus datos de acceso operativo.",
  },
  {
    title: "Activa el kiosk",
    text: "Abre el modo kiosk desde una sesión administrativa protegida.",
  },
  {
    title: "Fichan con PIN",
    text: "Cada empleado marca entrada o salida con validación segura.",
  },
  {
    title: "Consulta sesiones",
    text: "Revisa registros, horas y estado del equipo desde el panel.",
  },
];

const features = [
  "Registro de empresa y responsable",
  "Onboarding inicial guiado",
  "Dashboard de negocio",
  "Gestión de empleados",
  "Modo kiosk protegido",
  "PIN por empleado",
  "Entrada y salida de jornada",
  "Registro de sesiones",
  "Acceso protegido",
  "Datos separados por empresa",
  "Planes Free, Pro y Business",
  "Checkout preparado",
];

const pricingPlans = [
  {
    name: "Free",
    label: "Gratis",
    description: "Ideal para empezar a ordenar fichajes en un equipo pequeño.",
    features: [
      "Hasta 5 empleados",
      "Fichaje básico",
      "Modo kiosk",
      "Dashboard",
      "Registro de sesiones",
    ],
    cta: "Empezar gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    label: "Plan Pro",
    description: "Para negocios que necesitan más control, informes y exportaciones.",
    features: [
      "Hasta 30 empleados",
      "Exportaciones PDF y Excel",
      "Filtros avanzados",
      "Geolocalización de fichajes",
      "Informes de administración",
      "Soporte prioritario",
    ],
    cta: "Elegir Pro",
    highlighted: true,
  },
  {
    name: "Business",
    label: "Plan Business",
    description: "Para operaciones más grandes o con varias sedes.",
    features: [
      "Empleados ilimitados",
      "Multi negocio y sedes",
      "Geolocalización de fichajes",
      "Informes de administración",
      "Soporte prioritario",
      "Onboarding personalizado",
    ],
    cta: "Elegir Business",
    highlighted: false,
  },
];

const securityItems = [
  {
    icon: LockKeyhole,
    title: "Acceso protegido",
    text: "Las rutas privadas quedan detrás de sesión y permisos de usuario.",
  },
  {
    icon: ShieldCheck,
    title: "Sesiones seguras",
    text: "La sesión se gestiona de forma segura para mantener el acceso protegido.",
  },
  {
    icon: Building2,
    title: "Datos por empresa",
    text: "Cada empresa mantiene su equipo y sus registros separados y organizados.",
  },
  {
    icon: BadgeCheck,
    title: "HTTPS y dominio propio",
    text: "ClockLy funciona sobre app.clockly.es y api.clockly.es con HTTPS.",
  },
];

const faqs = [
  {
    question: "¿Qué es ClockLy?",
    answer:
      "ClockLy es un software de control horario para pequeñas empresas. Ayuda a registrar jornadas, gestionar empleados y consultar fichajes desde una plataforma web sencilla.",
  },
  {
    question: "¿Para qué sirve un software de control horario?",
    answer:
      "Sirve para organizar entradas, salidas y sesiones de trabajo del equipo, evitando hojas sueltas y dando visibilidad al responsable del negocio.",
  },
  {
    question: "¿ClockLy sirve para restaurantes y bares?",
    answer:
      "Sí. ClockLy está pensado para negocios con turnos y equipos operativos, como restaurantes, bares, cafeterías y otros negocios de hostelería.",
  },
  {
    question: "¿ClockLy sirve para barberías o centros de estética?",
    answer:
      "Sí. Barberías, peluquerías y centros de estética pueden usar ClockLy para registrar fichajes del equipo y mantener las jornadas ordenadas.",
  },
  {
    question: "¿Los empleados pueden fichar con PIN?",
    answer:
      "Sí. El modo kiosk permite que los empleados fichen entrada y salida con un PIN configurado para cada persona.",
  },
  {
    question: "¿Qué es el modo kiosk?",
    answer:
      "Es una pantalla de fichaje compartida que se abre desde una sesión administrativa. El equipo selecciona su perfil y valida el fichaje con PIN.",
  },
  {
    question: "¿Puedo gestionar empleados desde ClockLy?",
    answer:
      "Sí. La app permite crear, editar y organizar empleados, además de consultar sesiones y actividad desde el panel.",
  },
  {
    question: "¿ClockLy tiene plan gratuito?",
    answer:
      "Sí. El plan Free está preparado para empezar con hasta 5 empleados y las funciones básicas de control horario.",
  },
  {
    question: "¿Necesito instalar algo?",
    answer:
      "No. ClockLy es una plataforma web: puedes acceder desde el navegador y usar el kiosk en un dispositivo compartido.",
  },
  {
    question: "¿ClockLy está pensado para pequeñas empresas?",
    answer:
      "Sí. ClockLy prioriza simplicidad, rapidez de uso y una estructura clara para pequeños negocios con empleados.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "ClockLy",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "Software de control horario para pequeñas empresas, con gestión de empleados, fichajes, sesiones y modo kiosk con PIN.",
      offers: {
        "@type": "Offer",
        name: "Plan Free",
        price: "0",
        priceCurrency: "EUR",
        url: REGISTER_URL,
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

function CtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark";
}) {
  const styles = {
    primary:
      "bg-primary text-white shadow-[0_14px_35px_rgba(10,132,255,0.28)] hover:bg-primary-dark focus-visible:ring-primary/40",
    secondary:
      "border border-white/20 bg-white/10 text-white hover:bg-white/[0.15] focus-visible:ring-white/40",
    dark: "border border-border-strong bg-white text-ink hover:bg-surface-bg focus-visible:ring-primary/30",
  };

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-5 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles[variant]}`}
    >
      {children}
    </Link>
  );
}

function HeroProductScene() {
  return (
    <div
      className="pointer-events-none relative mx-auto mt-12 h-[420px] w-full max-w-5xl lg:absolute lg:bottom-[-70px] lg:right-[-70px] lg:mt-0 lg:h-[600px] lg:max-w-[760px]"
      aria-hidden="true"
    >
      <div className="landing-float absolute right-0 top-6 w-[82%] rounded-[18px] border border-white/[0.14] bg-white/[0.08] p-3 shadow-2xl backdrop-blur-xl lg:w-[700px]">
        <div className="rounded-[12px] bg-[#f8fbff] p-4 text-ink shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Dashboard</p>
              <p className="mt-1 text-lg font-bold text-slate-950">Cafetería Norte</p>
            </div>
            <div className="rounded-[8px] bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              Plan Free
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Empleados", "5/5"],
              ["Activos ahora", "3"],
              ["Sesiones hoy", "12"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[8px] border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-950">Sesiones recientes</p>
              <span className="text-xs font-semibold text-primary">Ver todas</span>
            </div>
            {[
              ["Lucía Moreno", "Entrada", "09:03"],
              ["Mario Ruiz", "Entrada", "09:11"],
              ["Nerea Costa", "Salida", "14:02"],
            ].map(([name, action, time]) => (
              <div
                key={`${name}-${time}`}
                className="flex items-center gap-3 border-t border-slate-100 py-2 first:border-t-0"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  {name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{action} registrada</p>
                </div>
                <p className="text-sm font-bold text-slate-900">{time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="landing-float-slow absolute bottom-2 left-0 w-[245px] rounded-[16px] border border-white/[0.16] bg-white/[0.09] p-3 shadow-2xl backdrop-blur-xl sm:left-10 lg:bottom-24 lg:left-0">
        <div className="rounded-[12px] bg-[#07111f] p-4 text-white">
          <div className="mb-4 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-bold">Kiosk</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
              <div
                key={key}
                className="flex h-10 items-center justify-center rounded-[8px] bg-white/10 text-sm font-bold"
              >
                {key}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-[8px] bg-cyan-300 px-3 py-2 text-center text-xs font-bold text-[#07111f]">
            Fichar entrada
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href={SITE_URL} aria-label="ClockLy inicio" className="rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
            <Logo size="sm" variant="white" />
          </Link>
          <nav aria-label="Navegación principal" className="hidden items-center gap-7 md:flex">
            {[
              ["Funciones", "#funciones"],
              ["Cómo funciona", "#como-funciona"],
              ["Precios", "#precios"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={LOGIN_URL}
              className="hidden rounded-[8px] px-3 py-2 text-sm font-semibold text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:inline-flex"
            >
              Entrar
            </Link>
            <CtaLink href={REGISTER_URL}>Probar ClockLy</CtaLink>
          </div>
        </div>
      </header>

      <section className="relative isolate bg-[#07111f] px-5 pb-14 pt-28 text-white sm:pb-20 sm:pt-32 lg:min-h-[760px] lg:px-8 lg:pb-24">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(10,132,255,0.28),transparent_34%),linear-gradient(180deg,#07111f_0%,#0b1726_100%)]" />
        <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-2xl pt-8 lg:pt-16">
            <h1 className="max-w-2xl text-balance text-5xl font-extrabold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Control horario simple para negocios que no tienen tiempo que perder.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-white/75">
              ClockLy ayuda a restaurantes, barberías, centros y negocios locales a registrar
              jornadas, gestionar empleados y controlar fichajes desde una plataforma sencilla y rápida.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <CtaLink href={REGISTER_URL}>
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </CtaLink>
              <CtaLink href="#como-funciona" variant="secondary">
                Ver cómo funciona
                <ChevronRight className="h-4 w-4" />
              </CtaLink>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 text-sm text-white/75 sm:grid-cols-3">
              {["Kiosk con PIN", "Sesiones claras", "Plan Free"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <HeroProductScene />
        </div>
      </section>

      <section id="funciones" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
              Control horario preparado para el día a día de un negocio real.
            </h2>
            <p className="mt-4 text-lg leading-8 text-ink-muted">
              Sin pantallas enormes ni procesos raros. ClockLy se centra en lo que un equipo pequeño
              necesita para fichar, revisar jornadas y seguir trabajando.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {proofPoints.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-[8px] border border-border bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold tracking-normal text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-bg px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
                Diseñado para negocios locales.
              </h2>
              <p className="mt-5 text-lg leading-8 text-ink-muted">
                ClockLy está pensado para empresas donde el tiempo importa: restaurantes,
                barberías, clínicas, talleres, centros de estética y pequeños equipos que
                necesitan fichar sin complicaciones.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {businessTypes.map((business) => (
                <article
                  key={business.title}
                  className="rounded-[8px] border border-border bg-white p-5 shadow-xs"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#e8fbff] text-cyan-700">
                    <Store className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold tracking-normal text-ink">{business.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{business.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
                De cero a fichar en cinco pasos.
              </h2>
              <p className="mt-4 text-lg leading-8 text-ink-muted">
                El flujo está pensado para que un responsable cree la empresa, organice el equipo
                y deje el kiosk listo para el primer turno.
              </p>
            </div>
            <CtaLink href={REGISTER_URL} variant="dark">
              Crear empresa
              <ArrowRight className="h-4 w-4" />
            </CtaLink>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-5">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="group relative rounded-[8px] border border-border bg-surface-muted p-5 transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md"
              >
                <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-[8px] bg-ink text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="text-base font-bold tracking-normal text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07111f] px-5 py-20 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
              Todo claro desde un único panel.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Visualiza empleados, fichajes recientes, estado del plan y acciones rápidas sin
              convertir el control horario en otro trabajo más.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-cyan-300" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.06] p-3 shadow-2xl">
            <div className="rounded-[12px] bg-white p-4 text-ink">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <aside className="rounded-[8px] bg-slate-950 p-4 text-white">
                  <Logo size="sm" variant="white" />
                  <div className="mt-8 space-y-2 text-sm">
                    {([
                      [LayoutDashboard, "Dashboard"],
                      [UsersRound, "Empleados"],
                      [Clock3, "Sesiones"],
                      [Fingerprint, "Kiosk"],
                    ] as const).map(([Icon, label]) => {
                      const TypedIcon = Icon as typeof LayoutDashboard;
                      return (
                        <div
                          key={label}
                          className="flex items-center gap-2 rounded-[8px] bg-white/[0.08] px-3 py-2 text-white/80"
                        >
                          <TypedIcon className="h-4 w-4" />
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </aside>
                <div className="min-w-0">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Hoy</p>
                      <h3 className="text-2xl font-bold tracking-normal text-slate-950">
                        Equipo operativo
                      </h3>
                    </div>
                    <div className="rounded-[8px] bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
                      3 activos
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {([
                      ["Empleados", "5", UsersRound],
                      ["Jornadas", "12", Clock3],
                      ["Ubicación", "Pro", MapPin],
                    ] as const).map(([label, value, Icon]) => {
                      const TypedIcon = Icon as typeof UsersRound;
                      return (
                        <div key={label} className="rounded-[8px] border border-slate-200 p-4">
                          <TypedIcon className="h-4 w-4 text-primary" />
                          <p className="mt-3 text-xs font-semibold text-slate-500">{label}</p>
                          <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-[8px] border border-slate-200">
                    {[
                      ["Ana Pastor", "Fichada", "09:00"],
                      ["Hugo Martín", "Fichada", "09:14"],
                      ["Clara Gil", "Salida", "14:03"],
                    ].map(([name, status, time]) => (
                      <div
                        key={name}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">{name}</p>
                          <p className="text-sm text-slate-500">{status}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-950">{time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
              Planes simples para empezar y crecer.
            </h2>
            <p className="mt-4 text-lg leading-8 text-ink-muted">
              Los límites salen del producto real: Free hasta 5 empleados, Pro hasta 30
              y Business sin límite de empleados.
            </p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-[8px] border p-6 shadow-xs ${
                  plan.highlighted
                    ? "border-primary bg-[#f6fbff] shadow-[0_16px_50px_rgba(10,132,255,0.12)]"
                    : "border-border bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-normal text-ink">{plan.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-primary">{plan.label}</p>
                  </div>
                  {plan.highlighted && (
                    <span className="rounded-[8px] bg-primary px-3 py-1 text-xs font-bold text-white">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="mt-5 min-h-14 text-sm leading-6 text-ink-muted">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-ink-soft">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <CtaLink href={REGISTER_URL} variant="dark">
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </CtaLink>
                </div>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-6 text-ink-muted">
            Los importes de Pro y Business se muestran en el checkout cuando la contratación esté
            configurada para esos planes.
          </p>
        </div>
      </section>

      <section className="bg-surface-bg px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
                Confianza sin convertir la landing en una ficha técnica.
              </h2>
              <p className="mt-5 text-lg leading-8 text-ink-muted">
                ClockLy está desplegado con dominio propio, HTTPS y una arquitectura pensada para
                separar empresas, proteger sesiones y acompañar el crecimiento del producto.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {securityItems.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-[8px] border border-border bg-white p-5 shadow-xs">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold tracking-normal text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
              Preguntas frecuentes sobre control horario.
            </h2>
            <p className="mt-4 text-lg leading-8 text-ink-muted">
              Respuestas directas para decidir si ClockLy encaja con tu negocio.
            </p>
          </div>
          <div className="mt-10 divide-y divide-border rounded-[8px] border border-border bg-white">
            {faqs.map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  {faq.question}
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-muted transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-5 py-20 text-white lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
              Empieza a controlar los fichajes de tu equipo hoy.
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/80">
              Crea tu empresa, añade empleados y empieza a registrar jornadas desde una plataforma sencilla.
            </p>
          </div>
          <CtaLink href={REGISTER_URL} variant="secondary">
            Empezar gratis
            <ArrowRight className="h-4 w-4" />
          </CtaLink>
        </div>
      </section>

      <footer className="border-t border-border bg-white px-5 py-10 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <Logo size="sm" />
            <p className="mt-4 max-w-md text-sm leading-6 text-ink-muted">
              Software sencillo de control horario para pequeñas empresas que necesitan fichar,
              organizar empleados y consultar sesiones sin complicarse.
            </p>
            <p className="mt-4 text-sm font-semibold text-ink-soft">app.clockly.es</p>
          </div>
          <nav aria-label="Enlaces del footer" className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ["Entrar", LOGIN_URL],
              ["Registro", REGISTER_URL],
              ["Funciones", "#funciones"],
              ["Precios", "#precios"],
              ["FAQ", "#faq"],
              ["Cómo funciona", "#como-funciona"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="font-medium text-ink-muted hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-border pt-6 text-sm text-ink-xmuted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ClockLy</span>
          <span>Control horario simple, rápido y preparado para negocios reales.</span>
        </div>
      </footer>
    </main>
  );
}

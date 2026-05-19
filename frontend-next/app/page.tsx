import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Dumbbell,
  FileSpreadsheet,
  Fingerprint,
  Gauge,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Mail,
  MapPin,
  MonitorSmartphone,
  ReceiptText,
  Scissors,
  ShieldCheck,
  Stethoscope,
  TimerReset,
  TrendingUp,
  Utensils,
  UsersRound,
  Wrench,
} from "lucide-react";
import { LandingPlanCards } from "@/components/landing/landing-plan-cards";
import { Logo } from "@/components/shared/logo";

const PUBLIC_SITE_URL = "https://clockly.es";
const APP_URL = "https://app.clockly.es";
const REGISTER_URL = `${APP_URL}/register-company`;
const LOGIN_URL = `${APP_URL}/login`;
const DEMO_EMAIL = "clockly.contact@gmail.com";
const DEMO_URL = `mailto:${DEMO_EMAIL}?subject=Demo%20privada%20ClockLy`;

export const metadata: Metadata = {
  title: "ClockLy | Control horario y gestión de empleados para pymes",
  description:
    "ClockLy es un software de control horario para restaurantes, comercios y pymes. Gestiona fichajes, empleados, centros de trabajo, retrasos, gastos y exportaciones desde una plataforma sencilla.",
  keywords: [
    "control horario",
    "software control horario",
    "fichaje empleados",
    "registro jornada laboral",
    "app fichar trabajo",
    "control horario restaurantes",
    "gestión empleados pyme",
    "reloj laboral online",
    "fichaje digital",
    "control de presencia",
    "control horario para pymes",
    "exportación de fichajes",
  ],
  alternates: {
    canonical: PUBLIC_SITE_URL,
  },
  openGraph: {
    title: "ClockLy | Control horario y gestión de empleados para pymes",
    description:
      "Software de control horario para restaurantes, comercios y pymes: fichajes, empleados, centros, retrasos, gastos y exportaciones en una plataforma clara.",
    url: PUBLIC_SITE_URL,
    siteName: "ClockLy",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: `${PUBLIC_SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "ClockLy, software de control horario para pymes en España",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClockLy | Control horario y gestión de empleados para pymes",
    description:
      "Control horario, fichaje digital, empleados, retrasos, gastos y exportaciones para negocios pequeños en España.",
    images: [`${PUBLIC_SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const navItems = [
  ["Funcionalidades", "#funcionalidades"],
  ["Sectores", "#sectores"],
  ["Registro horario", "#registro-horario"],
  ["Planes", "#planes"],
  ["FAQ", "#faq"],
] as const;

const trustIndicators = [
  "Menos papel y Excel",
  "Fichaje web y kiosk con PIN",
  "Pensado para pymes españolas",
  "Exportaciones para revisar datos",
];

const painPoints = [
  {
    title: "Fichajes repartidos",
    text: "Hojas de papel, mensajes de WhatsApp y notas sueltas hacen difícil saber quién ha entrado, salido o se ha olvidado de fichar.",
  },
  {
    title: "Excels que se rompen",
    text: "Copiar horas a mano consume tiempo, genera dudas y deja demasiada carga en la persona que revisa cada jornada.",
  },
  {
    title: "Retrasos poco visibles",
    text: "Cuando el equipo trabaja por turnos, detectar retrasos o incidencias tarde complica la operativa del día.",
  },
  {
    title: "Herramientas demasiado grandes",
    text: "Muchos negocios pequeños no necesitan un ERP completo: necesitan un control horario claro, rápido y fácil de usar.",
  },
];

const solutionItems = [
  {
    icon: Fingerprint,
    title: "Fichaje digital",
    text: "Entrada y salida desde navegador, kiosk o dispositivo compartido, con un flujo directo para equipos ocupados.",
  },
  {
    icon: UsersRound,
    title: "Gestión de empleados",
    text: "Alta de empleados, roles, permisos y datos operativos en un panel pensado para dueños y encargados.",
  },
  {
    icon: Building2,
    title: "Centros de trabajo",
    text: "Organiza locales, centros o ubicaciones para entender dónde se produce cada fichaje y cada incidencia.",
  },
  {
    icon: FileSpreadsheet,
    title: "Exportaciones",
    text: "Prepara datos de fichajes en formatos útiles para revisión interna, asesoría o seguimiento administrativo.",
  },
];

const featureCards: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Clock3,
    title: "Fichajes de entrada y salida",
    text: "Registra jornadas de forma ordenada y consulta el historial sin perseguir hojas ni capturas.",
  },
  {
    icon: KeyRound,
    title: "Modo kiosk con PIN",
    text: "Un punto de fichaje compartido para tablet, mostrador o recepción, protegido por sesión admin.",
  },
  {
    icon: UsersRound,
    title: "Gestión de empleados",
    text: "Crea perfiles, revisa actividad y mantiene los datos del equipo en un único lugar.",
  },
  {
    icon: Building2,
    title: "Centros de trabajo",
    text: "Separa locales, sedes o zonas de operación para entender mejor la jornada laboral.",
  },
  {
    icon: TimerReset,
    title: "Retrasos y puntualidad",
    text: "Detecta entradas tardías e incidencias para tomar decisiones con más contexto.",
  },
  {
    icon: ReceiptText,
    title: "Tickets y gastos",
    text: "Centraliza tickets operativos y gastos del equipo junto a la gestión diaria.",
  },
  {
    icon: Landmark,
    title: "Salarios estimados",
    text: "Consulta cálculos orientativos basados en fichajes para revisar antes de pagar.",
  },
  {
    icon: Download,
    title: "Exportaciones CSV/XLSX/ITSS",
    text: "Genera exportaciones para revisar registros, compartir datos o preparar documentación básica.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y permisos",
    text: "Diferencia owner, admin, RRHH, encargado y empleado para proteger cada superficie.",
  },
  {
    icon: MapPin,
    title: "Geolocalización puntual",
    text: "Guarda ubicación informativa en el momento del fichaje cuando el plan y el usuario lo permiten.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard y analítica",
    text: "Comprueba empleados activos, sesiones, retrasos, uso del plan y señales clave de operación.",
  },
];

const industries: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Utensils,
    title: "Restaurantes y bares",
    text: "Control horario para restaurantes con entradas, salidas, retrasos y turnos de sala o cocina desde una sola herramienta, sin depender de papel ni mensajes.",
  },
  {
    icon: Scissors,
    title: "Peluquerías y centros de estética",
    text: "Organiza fichajes de estilistas, cabinas, recepción y encargados con una app de fichaje simple para equipos con agenda movida.",
  },
  {
    icon: Stethoscope,
    title: "Clínicas y fisioterapeutas",
    text: "Mantén el registro horario del equipo sanitario, recepción y especialistas en un entorno claro para revisar jornadas.",
  },
  {
    icon: Dumbbell,
    title: "Gimnasios y centros deportivos",
    text: "Facilita el fichaje digital de entrenadores, recepción y personal de sala en negocios con horarios ampliados.",
  },
  {
    icon: Wrench,
    title: "Talleres y comercios",
    text: "Sustituye hojas sueltas por un reloj laboral online para controlar presencia, retrasos y fichajes de mostrador o taller.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Pequeñas empresas por turnos",
    text: "ClockLy encaja en pymes de 3 a 50 empleados que necesitan gestión de empleados y control de jornada laboral sin complejidad.",
  },
];

const workflowSteps = [
  {
    title: "Crea tu empresa",
    text: "Registra el negocio y deja preparada la cuenta de administración.",
  },
  {
    title: "Añade empleados",
    text: "Carga el equipo, roles y datos operativos que necesitas para empezar.",
  },
  {
    title: "Configura centros y permisos",
    text: "Ordena locales, responsables y accesos según cómo trabaja tu negocio.",
  },
  {
    title: "Empieza a fichar y exportar",
    text: "El equipo registra jornadas y tú revisas fichajes, retrasos y exportaciones.",
  },
];

const dashboardRows = [
  ["Laura Muñoz", "Entrada", "09:02", "Centro Norte"],
  ["Sergio Ramos", "Entrada tarde", "09:17", "Cocina"],
  ["Marta Gil", "Salida", "14:04", "Recepción"],
  ["Nerea Costa", "Entrada", "16:01", "Sala"],
] as const;

const productNavItems: Array<{ icon: LucideIcon; label: string }> = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Clock3, label: "Fichajes" },
  { icon: UsersRound, label: "Empleados" },
  { icon: Building2, label: "Centros" },
  { icon: ReceiptText, label: "Gastos" },
];

const previewSignals: Array<{ icon: LucideIcon; text: string }> = [
  { icon: MonitorSmartphone, text: "Funciona en navegador móvil, tablet y escritorio." },
  { icon: Gauge, text: "Indicadores claros para detectar incidencias antes." },
  { icon: TrendingUp, text: "Analítica operativa pensada para dueños y encargados." },
];

const faqs = [
  {
    question: "¿Qué es ClockLy?",
    answer:
      "ClockLy es un software de control horario para pymes, restaurantes, comercios y negocios con equipos pequeños. Ayuda a registrar fichajes, gestionar empleados, revisar retrasos y preparar exportaciones desde una plataforma web sencilla.",
  },
  {
    question: "¿Para qué sirve un software de control horario?",
    answer:
      "Un software de control horario sirve para centralizar entradas, salidas, horas trabajadas e incidencias. Reduce la dependencia del papel y del Excel, y facilita revisar el registro horario del equipo.",
  },
  {
    question: "¿ClockLy sirve para restaurantes y bares?",
    answer:
      "Sí. ClockLy está pensado para control horario para restaurantes, bares y cafeterías con turnos, sala, cocina, encargados y empleados que necesitan fichar rápido.",
  },
  {
    question: "¿Puedo usar ClockLy desde el móvil?",
    answer:
      "Sí. ClockLy es una plataforma web responsive, por lo que puede usarse desde móvil, tablet u ordenador sin instalar software pesado.",
  },
  {
    question: "¿Los empleados pueden fichar con PIN?",
    answer:
      "Sí. El modo kiosk permite que cada empleado fiche entrada o salida con un PIN configurado, usando una pantalla compartida y protegida por sesión de administración.",
  },
  {
    question: "¿ClockLy tiene geolocalización?",
    answer:
      "Sí, ClockLy puede guardar geolocalización puntual en el momento del fichaje cuando la función está disponible, el plan lo permite y el usuario autoriza el permiso del navegador.",
  },
  {
    question: "¿La geolocalización rastrea al trabajador todo el día?",
    answer:
      "No. La geolocalización de ClockLy está pensada como dato puntual asociado al fichaje, no como rastreo continuo durante toda la jornada.",
  },
  {
    question: "¿Puedo exportar los fichajes?",
    answer:
      "Sí. ClockLy incluye exportación de fichajes para revisar información, compartirla internamente o prepararla para asesoría según las necesidades del negocio.",
  },
  {
    question: "¿ClockLy sustituye a una asesoría laboral?",
    answer:
      "No. ClockLy ayuda a registrar y organizar datos de jornada, pero no sustituye el criterio de una asesoría laboral ni la revisión profesional de obligaciones legales.",
  },
  {
    question: "¿Puedo gestionar varios centros de trabajo?",
    answer:
      "Sí. ClockLy permite organizar centros de trabajo o ubicaciones para que el control de presencia tenga más contexto en negocios con varios locales o zonas.",
  },
  {
    question: "¿Qué diferencia hay entre ClockLy y un Excel?",
    answer:
      "Excel obliga a copiar datos, revisar fórmulas y ordenar información manualmente. ClockLy centraliza fichajes, empleados, retrasos y exportaciones en una herramienta diseñada para ese flujo.",
  },
  {
    question: "¿Puedo probar ClockLy gratis?",
    answer:
      "Sí. Puedes crear una cuenta y empezar con el plan Free para validar si el flujo de fichaje digital encaja con tu equipo.",
  },
  {
    question: "¿ClockLy sirve para pequeñas empresas?",
    answer:
      "Sí. ClockLy está pensado para pequeñas empresas y pymes españolas, especialmente negocios de 3 a 50 empleados que necesitan control horario sin complejidad.",
  },
  {
    question: "¿Qué datos se guardan de los empleados?",
    answer:
      "ClockLy guarda los datos necesarios para operar el fichaje y la gestión de empleados, como perfil, actividad de jornada, incidencias y, si se habilita, ubicación puntual del fichaje. Consulta la política de privacidad para más contexto.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${PUBLIC_SITE_URL}/#organization`,
      name: "ClockLy",
      url: PUBLIC_SITE_URL,
      logo: `${PUBLIC_SITE_URL}/clockly-flow-horizontal.svg`,
      email: DEMO_EMAIL,
      areaServed: {
        "@type": "Country",
        name: "España",
      },
    },
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${PUBLIC_SITE_URL}/#software`,
      name: "ClockLy",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "SaaS",
      operatingSystem: "Web",
      url: PUBLIC_SITE_URL,
      inLanguage: "es-ES",
      provider: {
        "@id": `${PUBLIC_SITE_URL}/#organization`,
      },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Pymes, restaurantes, comercios y negocios con empleados en España",
      },
      areaServed: {
        "@type": "Country",
        name: "España",
      },
      description:
        "Software de control horario para restaurantes, comercios y pymes con fichaje digital, gestión de empleados, centros de trabajo, retrasos, gastos y exportaciones.",
      featureList: [
        "Control horario",
        "Fichaje digital",
        "Modo kiosk con PIN",
        "Gestión de empleados",
        "Centros de trabajo",
        "Retrasos y puntualidad",
        "Tickets y gastos",
        "Exportación de fichajes",
        "Geolocalización puntual en fichajes",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${PUBLIC_SITE_URL}/#website`,
      name: "ClockLy",
      url: PUBLIC_SITE_URL,
      inLanguage: "es-ES",
      publisher: {
        "@id": `${PUBLIC_SITE_URL}/#organization`,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${PUBLIC_SITE_URL}/#faq`,
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

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function CtaLink({
  href,
  children,
  variant = "primary",
  className,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "light" | "dark";
  className?: string;
  ariaLabel?: string;
}) {
  const styles = {
    primary:
      "bg-primary text-white shadow-[0_14px_32px_rgba(10,132,255,0.22)] hover:bg-primary-dark focus-visible:ring-primary/35",
    secondary:
      "border border-border-strong bg-white text-ink shadow-xs hover:border-primary/30 hover:bg-primary/5 focus-visible:ring-primary/30",
    light:
      "border border-white/[0.22] bg-white text-ink shadow-[0_16px_36px_rgba(15,23,42,0.16)] hover:bg-white/[0.92] focus-visible:ring-white/60",
    dark: "border border-white/18 bg-[#0d1117] text-white hover:bg-[#1f2937] focus-visible:ring-ink/30",
  };
  const linkClassName = classNames(
    "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-5 py-3 text-sm font-semibold tracking-normal transition duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    styles[variant],
    className,
  );

  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={linkClassName} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={linkClassName} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function SectionHeading({
  title,
  text,
  align = "left",
}: {
  title: string;
  text: string;
  align?: "left" | "center";
}) {
  return (
    <div className={classNames("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">{text}</p>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:mx-0" aria-label="Vista previa del producto ClockLy">
      <div className="absolute -left-3 top-10 hidden h-20 w-20 rounded-[8px] border border-primary/20 bg-primary/10 sm:block" />
      <div className="absolute -bottom-4 right-8 hidden h-16 w-28 rounded-[8px] border border-emerald-500/20 bg-emerald-500/10 sm:block" />

      <div className="relative rounded-[8px] border border-border-strong bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
        <div className="rounded-[8px] border border-border bg-[#f8fafc]">
          <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
            <div>
              <p className="text-xs font-semibold tracking-normal text-ink-muted">Panel de hoy</p>
              <p className="mt-1 text-lg font-bold tracking-normal text-ink">Restaurante Norte</p>
            </div>
            <div className="flex items-center gap-2 rounded-[8px] bg-success-bg px-3 py-2 text-xs font-bold text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              4 activos
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {[
              ["Fichajes hoy", "28", "text-primary"],
              ["Retrasos", "2", "text-warning"],
              ["Horas", "94h", "text-ink"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-[8px] border border-border bg-white p-3 shadow-xs">
                <p className="text-[11px] font-semibold text-ink-muted">{label}</p>
                <p className={classNames("mt-2 text-2xl font-bold tracking-normal", color)}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-[8px] border border-border bg-white p-3 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold tracking-normal text-ink">Actividad reciente</p>
                <span className="text-xs font-semibold text-primary">Exportar</span>
              </div>
              <div className="space-y-2">
                {dashboardRows.slice(0, 3).map(([name, action, time, location]) => (
                  <div
                    key={`${name}-${time}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[8px] border border-border bg-surface-muted px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {action} · {location}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-ink">{time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute rounded-sm border border-white/60 p-3 text-white shadow-lg"
        style={{ backgroundColor: "#0d1117", left: "-28px", top: "320px", width: "224px" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-bold">Kiosk PIN</p>
          </div>
          <p className="text-xs text-white/55">09:03</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6"].map((key) => (
            <div
              key={key}
              className="flex h-9 items-center justify-center rounded-[8px] bg-white/10 text-sm font-bold"
            >
              {key}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-[8px] bg-cyan-300 px-3 py-2 text-center text-xs font-bold text-[#0d1117]">
          Fichar entrada
        </div>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-[8px] border border-border-strong bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
      <div className="grid overflow-hidden rounded-[8px] border border-border bg-white lg:grid-cols-[220px_1fr]">
        <aside className="bg-[#0d1117] p-5 text-white">
          <Logo size="sm" variant="white" />
          <nav aria-label="Vista previa de navegación del producto" className="mt-8 space-y-2">
            {productNavItems.map(({ icon: Icon, label }) => {
              return (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm text-white/72 first:bg-white/10 first:text-white"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 bg-[#f8fafc] p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-muted">Martes, 19 de mayo</p>
              <h3 className="mt-1 text-2xl font-bold tracking-normal text-ink">
                Operativa del equipo
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-[8px] bg-success-bg px-3 py-2 text-success">
                12 fichajes revisados
              </span>
              <span className="rounded-[8px] bg-warning-bg px-3 py-2 text-warning">
                2 retrasos
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              ["Activos", "8"],
              ["Horas hoy", "64h"],
              ["Centros", "3"],
              ["Gastos", "5"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] border border-border bg-white p-4 shadow-xs">
                <p className="text-xs font-semibold text-ink-muted">{label}</p>
                <p className="mt-2 text-2xl font-bold tracking-normal text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_280px]">
            <div className="rounded-[8px] border border-border bg-white shadow-xs">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border px-4 py-3 text-xs font-semibold text-ink-muted">
                <span>Empleado</span>
                <span>Hora</span>
                <span className="hidden sm:block">Centro</span>
              </div>
              {dashboardRows.map(([name, action, time, location]) => (
                <div
                  key={`${name}-${time}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{name}</p>
                    <p className="text-xs text-ink-muted">{action}</p>
                  </div>
                  <p className="text-sm font-bold text-ink">{time}</p>
                  <p className="hidden text-sm text-ink-muted sm:block">{location}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[8px] border border-border bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">Horas por turno</p>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Mañana", "82%"],
                  ["Tarde", "64%"],
                  ["Noche", "38%"],
                ].map(([label, width]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-ink-muted">
                      <span>{label}</span>
                      <span>{width}</span>
                    </div>
                    <div className="h-2 rounded-[8px] bg-surface-bg">
                      <div
                        className="h-2 rounded-[8px] bg-primary"
                        style={{ width }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[8px] bg-primary/[0.08] p-3 text-sm leading-6 text-ink-soft">
                Señales rápidas para revisar la jornada antes de cerrar el día.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="sticky top-0 z-50 border-b border-border bg-white/[0.92] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link
            href="/"
            aria-label="ClockLy inicio"
            className="rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Logo size="sm" />
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-7 lg:flex">
            {navItems.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-semibold text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={LOGIN_URL}
              className="hidden rounded-[8px] px-3 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:inline-flex"
            >
              Iniciar sesión
            </a>
            <CtaLink href={REGISTER_URL} className="px-4 sm:px-5">
              Crear cuenta
            </CtaLink>
          </div>
        </div>
      </header>

      <section className="relative border-b border-border bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_66%,#ffffff_100%)] px-5 pb-20 pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="absolute inset-0 pointer-events-none opacity-60 [background-image:linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.04] tracking-normal text-ink sm:text-5xl lg:text-6xl">
              Control horario simple para negocios que no tienen tiempo que perder
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-ink-muted">
              ClockLy ayuda a restaurantes, comercios y pymes a registrar jornadas,
              gestionar empleados, controlar retrasos y preparar exportaciones desde una
              plataforma clara y fácil de usar.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaLink href={DEMO_URL} ariaLabel="Solicitar demo privada de ClockLy">
                Solicitar demo privada
                <Mail className="h-4 w-4" />
              </CtaLink>
              <CtaLink href={REGISTER_URL} variant="secondary">
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </CtaLink>
              <CtaLink href="#funcionalidades" variant="secondary">
                Ver funcionalidades
                <ChevronRight className="h-4 w-4" />
              </CtaLink>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 text-sm text-ink-soft sm:grid-cols-2">
              {trustIndicators.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      <section className="bg-white px-5 py-20 lg:px-8" aria-labelledby="problemas-heading">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <h2
                id="problemas-heading"
                className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl"
              >
                El control horario se complica cuando todo depende de memoria, papel o Excel.
              </h2>
              <p className="mt-5 text-lg leading-8 text-ink-muted">
                La mayoría de dueños no necesita más burocracia. Necesita ver qué está
                pasando, corregir incidencias y cerrar el día con datos fiables.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {painPoints.map((point) => (
                <article key={point.title} className="rounded-[8px] border border-border bg-surface-muted p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] bg-white text-primary shadow-xs">
                    <CircleHelp className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold tracking-normal text-ink">{point.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{point.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f8fafc] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="ClockLy convierte fichajes, empleados y revisiones en un flujo sencillo."
            text="Una herramienta enfocada en el día a día: fichar rápido, revisar con claridad y preparar información útil sin perder la mañana ordenando datos."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {solutionItems.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-[8px] border border-border bg-white p-5 shadow-xs">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold tracking-normal text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            align="center"
            title="Funcionalidades para ordenar la gestión de empleados sin montar un sistema gigante."
            text="ClockLy reúne control horario, fichaje empleados, retrasos, gastos y exportación de fichajes en una experiencia ligera para negocios pequeños."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-[8px] border border-border bg-white p-5 shadow-xs transition duration-150 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eef6ff] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold tracking-normal text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="sectores" className="bg-[#0d1117] px-5 py-20 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
                Pensado para negocios reales
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/72">
                ClockLy no está diseñado para empresas con departamentos enormes. Está
                pensado para locales, turnos, encargados y equipos que necesitan claridad
                sin complicarse.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <CtaLink href={DEMO_URL} variant="light">
                  Solicitar demo privada
                  <Mail className="h-4 w-4" />
                </CtaLink>
                <CtaLink href={REGISTER_URL} variant="dark">
                  Crear cuenta
                  <ArrowRight className="h-4 w-4" />
                </CtaLink>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {industries.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-[8px] border border-white/10 bg-white/[0.06] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/10 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold tracking-normal text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/68">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="registro-horario" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
              Registro horario en España, sin complicarte la operativa
            </h2>
            <p className="mt-5 text-lg leading-8 text-ink-muted">
              En España, las empresas deben registrar la jornada laboral de sus
              trabajadores. ClockLy ayuda a centralizar fichajes, conservar registros y
              exportar información para revisión interna o asesoría.
            </p>
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              ClockLy facilita el registro horario, pero no sustituye asesoramiento legal
              ni garantiza por sí solo el cumplimiento de cada obligación aplicable a tu
              negocio. Revisa siempre tu caso con una asesoría laboral.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
              <Link href="/privacy" className="text-primary hover:underline">
                Privacidad
              </Link>
              <Link href="/terms" className="text-primary hover:underline">
                Términos
              </Link>
            </div>
          </div>

          <div className="rounded-[8px] border border-border bg-[#f8fafc] p-5 shadow-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Centraliza fichajes", "Entrada, salida, incidencias y sesiones en un mismo lugar."],
                ["Conserva registros", "Historial organizado para revisar qué ocurrió cada día."],
                ["Exporta información", "Datos preparados para análisis interno o asesoría."],
                ["Aclara incidencias", "Retrasos, olvidos y correcciones con más contexto."],
              ].map(([title, text]) => (
                <article key={title} className="rounded-[8px] border border-border bg-white p-4">
                  <BadgeCheck className="h-5 w-5 text-success" />
                  <h3 className="mt-4 text-base font-bold tracking-normal text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-border bg-[#f8fafc] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              title="Cómo funciona ClockLy"
              text="Un flujo directo para pasar de negocio desordenado a control horario operativo sin proyectos largos."
            />
            <CtaLink href={REGISTER_URL} variant="secondary">
              Crear empresa
              <ArrowRight className="h-4 w-4" />
            </CtaLink>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="rounded-[8px] border border-border bg-white p-5 shadow-xs">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-[8px] bg-ink text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="text-base font-bold tracking-normal text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 lg:px-8" aria-labelledby="preview-heading">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <h2
                id="preview-heading"
                className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl"
              >
                Una vista clara para tomar decisiones rápidas
              </h2>
              <p className="mt-5 text-lg leading-8 text-ink-muted">
                Revisa empleados activos, fichajes de hoy, retrasos, horas trabajadas,
                gastos y exportaciones sin navegar por menús interminables.
              </p>
              <div className="mt-7 grid gap-3 text-sm text-ink-soft">
                {previewSignals.map(({ icon: Icon, text }) => {
                  return (
                    <div key={text} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section id="planes" className="border-y border-border bg-[#f8fafc] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            align="center"
            title="Planes para empezar gratis y crecer con más control"
            text="La sección consulta los planes reales del producto. Si la API no responde, mostramos una referencia clara para que la landing siga siendo usable."
          />
          <LandingPlanCards registerUrl={REGISTER_URL} demoUrl={DEMO_URL} />
        </div>
      </section>

      <section id="faq" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            align="center"
            title="Preguntas frecuentes sobre control horario"
            text="Respuestas directas para saber si ClockLy encaja con la forma de trabajar de tu negocio."
          />
          <div className="mt-10 divide-y divide-border rounded-[8px] border border-border bg-white shadow-xs">
            {faqs.map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left font-bold tracking-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  <span>{faq.question}</span>
                  <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-ink-muted transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-5 py-20 text-white lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
              Empieza a ordenar el control horario de tu negocio
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/[0.82]">
              Menos papel, menos dudas y más claridad para gestionar fichajes, empleados
              y exportaciones desde una plataforma preparada para pymes españolas.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaLink href={REGISTER_URL} variant="light">
              Crear cuenta
              <ArrowRight className="h-4 w-4" />
            </CtaLink>
            <CtaLink href={DEMO_URL} variant="dark">
              Solicitar demo privada
              <Mail className="h-4 w-4" />
            </CtaLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white px-5 py-10 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.2fr_auto]">
          <div>
            <Logo size="sm" />
            <p className="mt-4 max-w-md text-sm leading-6 text-ink-muted">
              Software de control horario y gestión de empleados para restaurantes,
              comercios, clínicas, gimnasios, talleres y pymes en España.
            </p>
          </div>

          <nav
            aria-label="Enlaces del footer"
            className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3"
          >
            {[
              ["Inicio", "/"],
              ["Funcionalidades", "#funcionalidades"],
              ["Planes", "#planes"],
              ["FAQ", "#faq"],
              ["Privacidad", "/privacy"],
              ["Términos", "/terms"],
              ["Iniciar sesión", LOGIN_URL],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="font-medium text-ink-muted hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>

          <div>
            <p className="text-sm font-bold text-ink">Contacto</p>
            <a
              href={`mailto:${DEMO_EMAIL}`}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              {DEMO_EMAIL}
            </a>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-border pt-6 text-sm text-ink-xmuted sm:flex-row sm:items-center sm:justify-between">
          <span>© {currentYear} ClockLy</span>
          <span>Control horario simple, fichaje digital y gestión de empleados para pymes.</span>
        </div>
      </footer>
    </main>
  );
}

"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { usePlans } from "@/hooks/use-plans";
import type { PlanDefinition, PlanType } from "@/types/plan";

type PlanCode = PlanType;

interface LandingPlanCardsProps {
  registerUrl: string;
  demoUrl: string;
}

const fallbackPlans: PlanDefinition[] = [
  {
    code: "free",
    name: "Free",
    description: "Para empezar a ordenar fichajes en un equipo pequeño.",
    max_employees: 5,
    cta_label: "Empezar gratis",
    recommended: false,
    custom_onboarding: false,
    has_exports: false,
    has_advanced_filters: false,
    has_multi_location: false,
    has_geolocation: false,
    has_admin_reports: false,
    has_support: false,
    features: {
      has_exports: false,
      has_advanced_filters: false,
      has_multi_location: false,
      has_geolocation: false,
      has_admin_reports: false,
      has_support: false,
    },
    feature_labels: [
      "Fichaje básico",
      "Modo kiosk con PIN",
      "Gestión de empleados",
      "Dashboard inicial",
      "Hasta 5 empleados",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    description: "Para negocios en crecimiento que necesitan más revisión y exportaciones.",
    max_employees: 30,
    cta_label: "Solicitar demo",
    recommended: true,
    custom_onboarding: false,
    has_exports: true,
    has_advanced_filters: true,
    has_multi_location: false,
    has_geolocation: true,
    has_admin_reports: true,
    has_support: true,
    features: {
      has_exports: true,
      has_advanced_filters: true,
      has_multi_location: false,
      has_geolocation: true,
      has_admin_reports: true,
      has_support: true,
    },
    feature_labels: [
      "Exportaciones CSV/XLSX",
      "Filtros avanzados",
      "Geolocalización puntual",
      "Informes de administración",
      "Hasta 30 empleados",
    ],
  },
  {
    code: "business",
    name: "Business",
    description: "Para equipos con varias ubicaciones o necesidades de acompañamiento.",
    max_employees: null,
    cta_label: "Hablar con nosotros",
    recommended: false,
    custom_onboarding: true,
    has_exports: true,
    has_advanced_filters: true,
    has_multi_location: true,
    has_geolocation: true,
    has_admin_reports: true,
    has_support: true,
    features: {
      has_exports: true,
      has_advanced_filters: true,
      has_multi_location: true,
      has_geolocation: true,
      has_admin_reports: true,
      has_support: true,
    },
    feature_labels: [
      "Empleados ilimitados",
      "Multiubicación",
      "Onboarding personalizado",
      "Soporte prioritario",
      "Exportaciones e informes",
    ],
  },
];

const commercialCopy: Record<
  PlanCode,
  {
    summary: string;
    cta: string;
    href: (urls: LandingPlanCardsProps) => string;
  }
> = {
  free: {
    summary: "Para empezar sin fricción",
    cta: "Empezar gratis",
    href: ({ registerUrl }) => registerUrl,
  },
  pro: {
    summary: "Para negocios en crecimiento",
    cta: "Solicitar demo",
    href: ({ demoUrl }) => demoUrl,
  },
  business: {
    summary: "Para varias ubicaciones",
    cta: "Hablar con nosotros",
    href: ({ demoUrl }) => demoUrl,
  },
};

function employeesLabel(maxEmployees: number | null) {
  if (maxEmployees === null) return "Empleados ilimitados";
  return `Hasta ${maxEmployees} empleados`;
}

function normalizePlans(plans: PlanDefinition[] | undefined): PlanDefinition[] {
  if (!plans?.length) return fallbackPlans;

  const byCode = new Map(plans.map((plan) => [plan.code, plan]));
  return fallbackPlans.map((fallback) => byCode.get(fallback.code) ?? fallback);
}

export function LandingPlanCards({ registerUrl, demoUrl }: LandingPlanCardsProps) {
  const plansQuery = usePlans();
  const isFallback = plansQuery.isError || !plansQuery.data?.length;
  const plans = normalizePlans(plansQuery.data);

  return (
    <div className="mt-12">
      {plansQuery.isLoading && (
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-medium text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando planes...
        </div>
      )}

      {isFallback && !plansQuery.isLoading && (
        <p className="mx-auto mb-5 max-w-2xl rounded-[8px] border border-warning-border bg-warning-bg px-4 py-3 text-center text-sm leading-6 text-warning">
          No hemos podido cargar los planes en este momento. Mostramos una referencia
          comercial para que puedas comparar opciones.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const copy = commercialCopy[plan.code] ?? commercialCopy.free;
          const features = [
            employeesLabel(plan.max_employees),
            ...plan.feature_labels.filter((feature) => feature !== employeesLabel(plan.max_employees)),
          ].slice(0, 6);

          return (
            <article
              key={plan.code}
              className={
                plan.recommended
                  ? "relative rounded-[8px] border border-primary bg-white p-6 shadow-[0_18px_54px_rgba(10,132,255,0.16)]"
                  : "rounded-[8px] border border-border bg-white p-6 shadow-xs"
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-primary">{copy.summary}</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-normal text-ink">{plan.name}</h3>
                </div>
                {plan.recommended && (
                  <span className="rounded-[8px] bg-primary px-3 py-1 text-xs font-bold text-white">
                    Más elegido
                  </span>
                )}
              </div>
              <p className="mt-4 min-h-14 text-sm leading-6 text-ink-muted">
                {commercialCopy[plan.code]?.summary === copy.summary
                  ? plan.description
                  : fallbackPlans.find((fallback) => fallback.code === plan.code)?.description}
              </p>

              <ul className="mt-6 space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-6 text-ink-soft">
                    <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={copy.href({ registerUrl, demoUrl })}
                className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-border-strong bg-white px-5 py-3 text-sm font-semibold tracking-normal text-ink shadow-xs transition duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {copy.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import type { PlanDefinition, PlanListResponse } from "@/types/plan";

export const dynamic = "force-dynamic";

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

const fallbackPayload: PlanListResponse = { items: fallbackPlans };

function plansUrl() {
  const apiBase =
    process.env.API_URL_INTERNAL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "https://api.clockly.es";
  return new URL("/plans", apiBase);
}

function jsonWithFallbackHeaders(payload: PlanListResponse, source: "backend" | "fallback") {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "X-ClockLy-Plans-Source": source,
    },
  });
}

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(plansUrl(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (response.ok) {
      const payload = (await response.json()) as PlanListResponse;
      return jsonWithFallbackHeaders(payload, "backend");
    }

    console.warn("plans.proxy.upstream_non_ok", {
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    console.warn("plans.proxy.fallback", error);
  } finally {
    clearTimeout(timeout);
  }

  return jsonWithFallbackHeaders(fallbackPayload, "fallback");
}

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-ClockLy-Plans-Source": "head",
    },
  });
}

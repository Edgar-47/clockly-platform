"use client";

import { Topbar } from "@/components/shared/topbar";
import { PlanCards } from "@/components/shared/plan-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/hooks/use-auth";

export default function SettingsPage() {
  const me = useMe();
  return (
    <>
      <Topbar title="Configuración" />
      <div className="space-y-5 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Empresa activa</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="text-[12px] font-medium text-ink-muted mb-1">Nombre</dt>
                <dd className="text-[14px] font-semibold text-ink">{me.data?.company.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-ink-muted mb-1">Slug</dt>
                <dd className="text-[14px] font-semibold text-ink">{me.data?.company.slug ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-ink-muted mb-1">Zona horaria</dt>
                <dd className="text-[14px] font-semibold text-ink">{me.data?.company.timezone ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plan y suscripcion</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Plan actual</dt>
                <dd className="text-[14px] font-semibold text-ink">{me.data?.company.plan_name ?? "-"}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Empleados incluidos</dt>
                <dd className="text-[14px] font-semibold text-ink">
                  {me.data?.company.max_employees ?? "Sin limite"}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[12px] font-medium text-ink-muted">Suscripcion</dt>
                <dd className="text-[14px] font-semibold text-ink">
                  {me.data?.company.is_active_subscription ? "Activa" : "Inactiva"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <PlanCards currentPlan={me.data?.company.plan_type} compact />
      </div>
    </>
  );
}

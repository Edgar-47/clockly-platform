"use client";

import { ArrowUpRight } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { PlanCards } from "@/components/shared/plan-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/hooks/use-auth";

export default function UpgradePage() {
  const me = useMe();
  const company = me.data?.company;

  return (
    <>
      <Topbar title="Upgrade" />
      <div className="space-y-5 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Plan actual: {company?.plan_name ?? "-"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm md:grid-cols-4">
              <div>
                <dt className="text-[12px] text-ink-muted">Empleados</dt>
                <dd className="font-semibold text-ink">{company?.max_employees ?? "Sin límite"}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-muted">Exportaciones</dt>
                <dd className="font-semibold text-ink">{company?.has_exports ? "Incluidas" : "No incluidas"}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-muted">Geolocalizacion</dt>
                <dd className="font-semibold text-ink">{company?.has_geolocation ? "Incluida" : "No incluida"}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-muted">Suscripcion</dt>
                <dd className="font-semibold text-ink">{company?.is_active_subscription ? "Activa" : "Pendiente"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <PlanCards currentPlan={company?.plan_type} />
      </div>
    </>
  );
}

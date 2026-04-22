"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Clock3, Settings, ShieldCheck, Users } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/auth.service";
import { useDashboard } from "@/hooks/use-dashboard";
import { useEmployees } from "@/hooks/use-employees";

export default function BusinessesPage() {
  const session = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authService.me,
  });
  const employees = useEmployees();
  const dashboard = useDashboard();
  const activeEmployees = employees.data?.filter((employee) => employee.is_active).length ?? 0;

  return (
    <>
      <Topbar title="Negocios" />
      <div className="space-y-6 p-8">
        {(session.error || dashboard.error) && (
          <div className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            No se pudo cargar la informacion del negocio.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Negocios activos"
            value={session.data?.company ? 1 : 0}
            icon={<Building2 className="h-5 w-5" />}
            iconColor="blue"
            loading={session.isLoading}
          />
          <StatCard
            label="Empleados activos"
            value={activeEmployees}
            icon={<Users className="h-5 w-5" />}
            iconColor="green"
            loading={employees.isLoading}
          />
          <StatCard
            label="Trabajando ahora"
            value={dashboard.data?.total_clocked_in ?? 0}
            icon={<Clock3 className="h-5 w-5" />}
            iconColor="orange"
            loading={dashboard.isLoading}
          />
          <StatCard
            label="Rol actual"
            value={session.data?.user.role ?? "-"}
            icon={<ShieldCheck className="h-5 w-5" />}
            iconColor="gray"
            loading={session.isLoading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Negocio activo</CardTitle>
              <Button asChild size="sm" variant="secondary">
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  Ajustes
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <th className="py-3 pr-4">Nombre</th>
                      <th className="py-3 pr-4">Slug</th>
                      <th className="py-3 pr-4">Zona horaria</th>
                      <th className="py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-4 pr-4 font-semibold text-ink">
                        {session.data?.company.name ?? "-"}
                      </td>
                      <td className="py-4 pr-4 text-ink-muted">
                        {session.data?.company.slug ?? "-"}
                      </td>
                      <td className="py-4 pr-4 text-ink-muted">
                        {session.data?.company.timezone ?? "-"}
                      </td>
                      <td className="py-4">
                        <Badge variant="success">Activo</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permisos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {session.data?.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
                {!session.isLoading && !session.data?.permissions.length && (
                  <p className="text-sm text-ink-muted">Sin permisos asignados.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

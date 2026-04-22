"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Shield, TicketCheck, UserCog, Users } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/auth.service";
import { useDashboard } from "@/hooks/use-dashboard";
import { useEmployees } from "@/hooks/use-employees";
import { useTickets } from "@/hooks/use-tickets";

export default function SuperadminPage() {
  const session = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authService.me,
  });
  const dashboard = useDashboard();
  const employees = useEmployees();
  const tickets = useTickets();
  const activeEmployees = employees.data?.filter((employee) => employee.is_active) ?? [];
  const openTickets = tickets.data?.filter((ticket) => ticket.status !== "closed") ?? [];

  return (
    <>
      <Topbar title="Superadmin" />
      <div className="space-y-6 p-8">
        {(session.error || dashboard.error || employees.error) && (
          <div className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            No se pudo cargar la consola.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Empresas"
            value={session.data?.company ? 1 : 0}
            icon={<Building2 className="h-5 w-5" />}
            iconColor="blue"
            loading={session.isLoading}
          />
          <StatCard
            label="Usuarios y empleados"
            value={activeEmployees.length + (session.data?.user ? 1 : 0)}
            icon={<Users className="h-5 w-5" />}
            iconColor="green"
            loading={employees.isLoading || session.isLoading}
          />
          <StatCard
            label="Sesiones abiertas"
            value={dashboard.data?.total_clocked_in ?? 0}
            icon={<Activity className="h-5 w-5" />}
            iconColor="orange"
            loading={dashboard.isLoading}
          />
          <StatCard
            label="Incidencias abiertas"
            value={openTickets.length}
            icon={<TicketCheck className="h-5 w-5" />}
            iconColor="red"
            loading={tickets.isLoading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Tenant</CardTitle>
              <Badge variant="success">Activo</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Empresa</span>
                <span className="font-semibold text-ink">{session.data?.company.name ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Slug</span>
                <span className="font-mono text-ink">{session.data?.company.slug ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Zona</span>
                <span className="text-ink">{session.data?.company.timezone ?? "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Acceso</CardTitle>
              <Shield className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Usuario</span>
                <span className="font-semibold text-ink">{session.data?.user.full_name ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Rol</span>
                <Badge variant="outline">{session.data?.user.role ?? "-"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Permisos</span>
                <span className="font-semibold text-ink">{session.data?.permissions.length ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Equipo</CardTitle>
              <UserCog className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              {activeEmployees.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  Sin empleados activos.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeEmployees.slice(0, 6).map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {employee.full_name}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {employee.role_title ?? "Empleado"}
                        </p>
                      </div>
                      <Badge variant="success">Activo</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

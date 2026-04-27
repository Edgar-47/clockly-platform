"use client";

import { BarChart3, Clock, TrendingUp, Users } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useMe } from "@/hooks/use-auth";
import { formatDateTime, formatPercent, formatSeconds } from "@/lib/format";
import { Topbar } from "@/components/shared/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const dashboard = useDashboard();
  const me = useMe();
  const data = dashboard.data;
  const kpis = data?.kpis;
  const employees = data?.metrics?.employees ?? [];
  const maxWorked = Math.max(...employees.map((employee) => employee.worked_seconds), 1);
  const recentSessions = data?.recent_sessions ?? [];

  return (
    <>
      <Topbar title="Analíticas" />
      <div className="space-y-5 p-6">
        {dashboard.error && (
          <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger-DEFAULT">
            No se pudieron cargar las analíticas.
          </div>
        )}
        {me.data && !me.data.company.has_admin_reports && (
          <div
            className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT"
            title="Disponible en Pro"
          >
            Informes avanzados disponibles en Pro.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total horas registradas"
            value={kpis ? formatSeconds(kpis.total_worked_seconds) : "0m"}
            icon={<Clock className="h-5 w-5" />}
            iconColor="blue"
            loading={dashboard.isLoading}
          />
          <StatCard
            label="Top empleado"
            value={kpis?.top_worker ?? "Sin datos"}
            icon={<Users className="h-5 w-5" />}
            iconColor="green"
            loading={dashboard.isLoading}
          />
          <StatCard
            label="Sesiones abiertas"
            value={kpis?.open_sessions ?? data?.total_clocked_in ?? 0}
            icon={<BarChart3 className="h-5 w-5" />}
            iconColor="orange"
            loading={dashboard.isLoading}
          />
          <StatCard
            label="Presentes ahora"
            value={kpis ? formatPercent(kpis.active_ratio) : "0%"}
            icon={<TrendingUp className="h-5 w-5" />}
            iconColor="green"
            loading={dashboard.isLoading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Ranking de horas registradas</CardTitle>
              <Badge variant="outline">{employees.length} empleados</Badge>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  Sin horas registradas en el periodo.
                </p>
              ) : (
                <div className="space-y-4">
                  {employees.map((employee, index) => (
                    <div key={employee.employee_id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <span className="truncate font-semibold text-ink">
                            {employee.employee_name}
                          </span>
                        </div>
                        <span className="shrink-0 text-ink-muted">
                          {formatSeconds(employee.worked_seconds)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-bg">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${Math.max(4, (employee.worked_seconds / maxWorked) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Actividad reciente</CardTitle>
              <Badge variant="outline">{recentSessions.length} fichajes</Badge>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  Sin fichajes recientes.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {session.employee?.full_name ?? session.employee_name}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {formatDateTime(session.clock_in_time)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-ink-muted">
                        {session.total_seconds ? formatSeconds(session.total_seconds) : "0m"}
                      </span>
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

"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useMe } from "@/hooks/use-auth";
import {
  useAnalyticsAnomalies,
  useAnalyticsPunctuality,
  useAnalyticsTrends,
  type AnalyticsPeriod,
} from "@/hooks/use-analytics";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatSeconds } from "@/lib/format";
import { Topbar } from "@/components/shared/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "90 días", value: "90d" },
  { label: "12 meses", value: "12m" },
];

const ANOMALY_LABELS: Record<string, string> = {
  frequent_late: "Retrasos frecuentes",
  long_session: "Jornada larga",
  auto_clockout: "Salida automática",
};
const ANOMALY_COLORS: Record<string, string> = {
  frequent_late: "bg-warning-bg text-warning-DEFAULT border-warning-border",
  long_session: "bg-danger-bg text-danger-DEFAULT border-danger-border",
  auto_clockout: "bg-primary/10 text-primary border-primary/30",
};

function SparklineBars({ data }: { data: { worked_seconds: number; date: string }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.worked_seconds), 1);
  const w = data.length * 2;
  return (
    <svg
      viewBox={`0 0 ${w} 100`}
      className="h-28 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {data.map((day, i) => {
        const barH = Math.max(3, (day.worked_seconds / max) * 97);
        return (
          <rect
            key={day.date}
            x={i * 2 + 0.15}
            y={100 - barH}
            width={1.7}
            height={barH}
            rx="0.5"
            className="fill-primary/70 transition-colors hover:fill-primary"
          />
        );
      })}
    </svg>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <svg viewBox="0 0 100 6" className="h-2 w-full" preserveAspectRatio="none" aria-hidden="true">
      <rect width="100" height="6" rx="3" className="fill-surface-bg" />
      <rect width={Math.max(2, pct)} height="6" rx="3" className={color} />
    </svg>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const me = useMe();
  const dashboard = useDashboard();
  const trends = useAnalyticsTrends(period);
  const punctuality = useAnalyticsPunctuality();
  const anomalies = useAnalyticsAnomalies(30);

  const hasReports = me.data?.company.has_admin_reports ?? false;
  const trendsData = trends.data;
  const punctData = punctuality.data?.employees ?? [];
  const anomalyList = anomalies.data?.anomalies ?? [];

  const compPct = trendsData?.comparison_pct;
  const compPositive = compPct !== null && compPct !== undefined && compPct >= 0;

  const employees = dashboard.data?.metrics?.employees ?? [];
  const maxWorked = Math.max(...employees.map((e) => e.worked_seconds), 1);

  return (
    <>
      <Topbar title="Analíticas" />
      <div className="space-y-5 p-4 sm:p-6">
        {!hasReports && (
          <div className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT">
            Informes avanzados disponibles en Pro. Actualiza para ver tendencias, puntualidad y
            anomalías.
          </div>
        )}

        {hasReports && (
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p.value
                    ? "bg-primary text-white"
                    : "border border-border bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total horas registradas"
            value={
              hasReports && trendsData
                ? formatSeconds(trendsData.total_worked_seconds)
                : formatSeconds(dashboard.data?.kpis?.total_worked_seconds ?? 0)
            }
            icon={<Clock className="h-5 w-5" />}
            iconColor="blue"
            loading={trends.isLoading || dashboard.isLoading}
          />
          <StatCard
            label="Media diaria"
            value={hasReports && trendsData ? formatSeconds(trendsData.avg_daily_seconds) : "—"}
            icon={<BarChart3 className="h-5 w-5" />}
            iconColor="green"
            loading={trends.isLoading}
          />
          <StatCard
            label="Sesiones abiertas"
            value={dashboard.data?.kpis?.open_sessions ?? dashboard.data?.total_clocked_in ?? 0}
            icon={<Users className="h-5 w-5" />}
            iconColor="orange"
            loading={dashboard.isLoading}
          />
          <StatCard
            label="Anomalías detectadas"
            value={hasReports ? anomalyList.length : "—"}
            icon={<Zap className="h-5 w-5" />}
            iconColor={anomalyList.length > 0 ? "orange" : "green"}
            loading={anomalies.isLoading}
          />
        </div>

        {hasReports && (
          <Card>
            <CardHeader className="flex-row items-start justify-between pb-4">
              <div>
                <CardTitle>Tendencia de horas</CardTitle>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Horas trabajadas por día —{" "}
                  {PERIODS.find((p) => p.value === period)?.label}
                </p>
              </div>
              {compPct !== null && compPct !== undefined && (
                <div
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    compPositive
                      ? "bg-success-bg text-success-DEFAULT"
                      : "bg-danger-bg text-danger-DEFAULT"
                  }`}
                >
                  {compPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {compPositive ? "+" : ""}
                  {compPct.toFixed(1)}% vs periodo anterior
                </div>
              )}
            </CardHeader>
            <CardContent>
              {trends.isLoading ? (
                <p className="py-8 text-center text-sm text-ink-muted">Cargando tendencias…</p>
              ) : (trendsData?.data.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  Sin datos para el periodo seleccionado.
                </p>
              ) : (
                <>
                  <SparklineBars data={trendsData!.data} />
                  <div className="mt-1 flex justify-between text-[10px] text-ink-xmuted">
                    <span>{trendsData!.data[0]?.date}</span>
                    <span>{trendsData!.data[trendsData!.data.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle>Puntualidad por empleado</CardTitle>
              <Badge variant="outline">{punctData.length} empleados</Badge>
            </CardHeader>
            <CardContent>
              {!hasReports ? (
                <p className="py-6 text-center text-sm text-ink-muted">Disponible en Pro.</p>
              ) : punctuality.isLoading ? (
                <p className="py-6 text-center text-sm text-ink-muted">Cargando…</p>
              ) : punctData.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">
                  Sin datos de puntualidad.
                </p>
              ) : (
                <div className="space-y-4">
                  {punctData.map((emp) => {
                    const pct = Math.round(emp.punctuality_rate * 100);
                    const barColor =
                      pct >= 90
                        ? "fill-success-DEFAULT"
                        : pct >= 70
                          ? "fill-warning-DEFAULT"
                          : "fill-danger-DEFAULT";
                    return (
                      <div key={emp.employee_id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-ink">
                            {emp.employee_name}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            {emp.late_count > 0 && (
                              <span className="text-xs text-danger-DEFAULT">
                                {emp.late_count} retrasos
                              </span>
                            )}
                            <span className="font-semibold text-ink">{pct}%</span>
                          </div>
                        </div>
                        <ProgressBar pct={pct} color={barColor} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle>Alertas detectadas</CardTitle>
              {hasReports && anomalyList.length > 0 && (
                <Badge variant="destructive">{anomalyList.length} alertas</Badge>
              )}
            </CardHeader>
            <CardContent>
              {!hasReports ? (
                <p className="py-6 text-center text-sm text-ink-muted">Disponible en Pro.</p>
              ) : anomalies.isLoading ? (
                <p className="py-6 text-center text-sm text-ink-muted">Analizando patrones…</p>
              ) : anomalyList.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm font-medium text-success-DEFAULT">Sin anomalías</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Todo parece normal en los últimos 30 días.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anomalyList.map((anomaly, i) => (
                    <div
                      key={`${anomaly.employee_id}-${anomaly.anomaly_type}-${i}`}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm ${
                        ANOMALY_COLORS[anomaly.anomaly_type] ?? "border-border bg-surface"
                      }`}
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold">{anomaly.employee_name}</p>
                        <p className="text-xs opacity-80">{anomaly.description}</p>
                      </div>
                      <span className="ml-auto shrink-0 rounded-full bg-white/40 px-2 py-0.5 text-[11px] font-medium">
                        {ANOMALY_LABELS[anomaly.anomaly_type] ?? anomaly.anomaly_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {employees.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle>Ranking de horas</CardTitle>
              <Badge variant="outline">{employees.length} empleados</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.map((employee, index) => (
                  <div key={employee.employee_id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
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
                    <ProgressBar
                      pct={Math.max(2, (employee.worked_seconds / maxWorked) * 100)}
                      color="fill-primary"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

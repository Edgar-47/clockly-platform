"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LateArrivalChartsResponse, LateArrivalEmployeeRank } from "@/types/late-arrival";

function BarChart({
  data,
  valueKey,
  maxValue,
  colorClass = "bg-primary",
}: {
  data: { label: string; value: number }[];
  valueKey?: string;
  maxValue: number;
  colorClass?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-[12px] text-ink-muted">Sin datos para este periodo</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {data.map((item) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-right text-[11px] text-ink-muted truncate" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 h-4 rounded-sm bg-surface-bg overflow-hidden">
              <div
                className={`h-full rounded-sm transition-all duration-300 ${colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-[11px] font-semibold tabular-nums text-ink">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EmployeeRankCard({ employees }: { employees: LateArrivalEmployeeRank[] }) {
  if (employees.length === 0) {
    return (
      <p className="py-6 text-center text-[12px] text-ink-muted">Sin datos para este periodo</p>
    );
  }

  const maxCount = Math.max(...employees.map((e) => e.count), 1);

  return (
    <div className="space-y-2">
      {employees.map((emp, idx) => {
        const pct = (emp.count / maxCount) * 100;
        return (
          <div key={emp.employee_id} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-[11px] font-bold text-ink-muted">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="truncate text-[12px] font-medium text-ink">{emp.employee_name}</span>
                <span className="ml-2 shrink-0 text-[11px] tabular-nums text-ink-muted">
                  {emp.count} · {emp.total_minutes} min
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-bg overflow-hidden">
                <div
                  className="h-full rounded-full bg-danger-DEFAULT/70 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LateArrivalCharts({
  charts,
  loading,
}: {
  charts?: LateArrivalChartsResponse;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="shadow-xs">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!charts) return null;

  const byDayFormatted = charts.by_day.slice(-14).map((p) => ({
    label: p.label.slice(5), // "MM-DD"
    value: p.count,
  }));
  const maxByDay = Math.max(...byDayFormatted.map((d) => d.value), 1);

  const byWeekday = charts.by_weekday.map((p) => ({ label: p.label, value: p.count }));
  const maxByWeekday = Math.max(...byWeekday.map((d) => d.value), 1);

  const byMonth = charts.by_month.map((p) => ({ label: p.label, value: p.count }));
  const maxByMonth = Math.max(...byMonth.map((d) => d.value), 1);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-[13px] font-semibold">Retrasos por día (últimos 14)</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={byDayFormatted} maxValue={maxByDay} colorClass="bg-warning-DEFAULT" />
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-[13px] font-semibold">Distribución por día de semana</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={byWeekday} maxValue={maxByWeekday} colorClass="bg-primary" />
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-[13px] font-semibold">Retrasos por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={byMonth} maxValue={maxByMonth} colorClass="bg-primary" />
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-[13px] font-semibold">Empleados con más retrasos</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeRankCard employees={charts.top_employees} />
        </CardContent>
      </Card>
    </div>
  );
}

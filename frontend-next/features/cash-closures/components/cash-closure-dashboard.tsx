"use client";

import { AlertTriangle, Banknote, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CashClosureChartsResponse, CashClosureStats } from "@/types/cash-closure";
import { money } from "./cash-closure-form";

function numberValue(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    success: "bg-success-bg text-success-DEFAULT",
    danger: "bg-danger-bg text-danger-DEFAULT",
    warning: "bg-warning-bg text-warning-DEFAULT",
  }[tone];

  return (
    <Card className="shadow-xs">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-ink-muted">{label}</p>
          <p className="truncate text-[18px] font-semibold tabular-nums text-ink">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-[12px] text-ink-muted">Sin datos</p>;
  }
  const max = Math.max(...data.map((point) => point.value), 1);
  const min = Math.min(...data.map((point) => point.value), 0);
  const range = Math.max(max - min, 1);
  const width = 320;
  const height = 120;
  const points = data.map((point, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - ((point.value - min) / range) * (height - 18) - 9;
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-primary"
          points={points.join(" ")}
        />
        {points.map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return <circle key={data[index].label} cx={x} cy={y} r="3.5" className="fill-primary" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between gap-2 text-[10px] text-ink-xmuted">
        {data.slice(-6).map((point) => (
          <span key={point.label} className="truncate">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompareBars({ data }: { data: { label: string; theoretical: number; real: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-[12px] text-ink-muted">Sin datos</p>;
  }
  const max = Math.max(...data.flatMap((point) => [point.theoretical, point.real]), 1);
  return (
    <div className="space-y-3">
      {data.slice(-8).map((point) => (
        <div key={point.label} className="grid grid-cols-[70px_1fr] items-center gap-2">
          <span className="truncate text-right text-[11px] text-ink-muted">{point.label}</span>
          <div className="space-y-1">
            <div className="h-2 rounded-sm bg-surface-bg">
              <div className="h-2 rounded-sm bg-ink-muted/40" style={{ width: `${(point.theoretical / max) * 100}%` }} />
            </div>
            <div className="h-2 rounded-sm bg-surface-bg">
              <div className="h-2 rounded-sm bg-primary" style={{ width: `${(point.real / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-3 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-ink-muted/40" />Teorico</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" />Real</span>
      </div>
    </div>
  );
}

function PaymentPie({ cash, card }: { cash: number; card: number }) {
  const total = cash + card;
  const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0;
  const style = {
    background: `conic-gradient(#16A34A 0 ${cashPct}%, #0A84FF ${cashPct}% 100%)`,
  };
  return (
    <div className="flex items-center justify-center gap-6">
      <div className="h-28 w-28 rounded-full border border-border" style={style} />
      <div className="space-y-2 text-[12px]">
        <p className="flex items-center gap-2 text-ink"><span className="h-2.5 w-2.5 rounded-sm bg-success-DEFAULT" />Efectivo {money(cash)}</p>
        <p className="flex items-center gap-2 text-ink"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />Tarjeta {money(card)}</p>
      </div>
    </div>
  );
}

export function CashClosureDashboard({
  stats,
  charts,
  loading,
}: {
  stats?: CashClosureStats;
  charts?: CashClosureChartsResponse;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  const balance = numberValue(stats?.total_balance);
  const lineData = (charts?.revenue_by_period ?? []).slice(-14).map((point) => ({
    label: point.label,
    value: numberValue(point.real_total),
  }));
  const compareData = (charts?.theoretical_vs_real ?? []).map((point) => ({
    label: point.label,
    theoretical: numberValue(point.theoretical_total),
    real: numberValue(point.real_total),
  }));
  const cash = numberValue(charts?.payment_mix.cash_total ?? stats?.cash_total);
  const card = numberValue(charts?.payment_mix.card_total ?? stats?.card_total);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Ingresos reales" value={money(numberValue(stats?.total_real))} icon={TrendingUp} tone="success" />
        <StatTile label="Teorico" value={money(numberValue(stats?.total_theoretical))} icon={BarChart3} />
        <StatTile label="Balance" value={money(balance)} icon={Banknote} tone={balance === 0 ? "success" : "danger"} />
        <StatTile label="Incidencias" value={`${stats?.incidence_count ?? 0}`} icon={AlertTriangle} tone={(stats?.incidence_count ?? 0) > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-xs xl:col-span-2">
          <CardHeader>
            <CardTitle>Ingresos por periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={lineData} />
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Efectivo vs tarjeta</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentPie cash={cash} card={card} />
          </CardContent>
        </Card>

        <Card className="shadow-xs xl:col-span-2">
          <CardHeader>
            <CardTitle>Teorico vs real</CardTitle>
          </CardHeader>
          <CardContent>
            <CompareBars data={compareData} />
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Empleados con mas incidencias</CardTitle>
          </CardHeader>
          <CardContent>
            {(charts?.top_incidence_users ?? []).length === 0 ? (
              <p className="py-8 text-center text-[12px] text-ink-muted">Sin incidencias</p>
            ) : (
              <div className="space-y-3">
                {charts?.top_incidence_users.map((row, index) => (
                  <div key={row.user_id ?? row.user_name} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-surface-bg text-[11px] font-semibold text-ink-muted">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{row.user_name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {row.incidence_count} incidencias - {money(numberValue(row.incidence_amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

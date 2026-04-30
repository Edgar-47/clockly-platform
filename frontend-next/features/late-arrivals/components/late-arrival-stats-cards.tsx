import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LateArrivalStats } from "@/types/late-arrival";

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "danger" | "success" | "warning";
}) {
  const valueColor =
    highlight === "danger"
      ? "text-danger-DEFAULT"
      : highlight === "success"
        ? "text-success-DEFAULT"
        : highlight === "warning"
          ? "text-warning-DEFAULT"
          : "text-ink";

  return (
    <Card className="shadow-xs">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-xmuted">{label}</p>
        <p className={`mt-1 text-[22px] font-bold tabular-nums leading-none ${valueColor}`}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-ink-muted">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function LateArrivalStatsCards({
  stats,
  loading,
}: {
  stats?: LateArrivalStats;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-xs">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total retrasos"
        value={String(stats.total_count)}
        sub={`${stats.pending_count} pendientes de revisar`}
        highlight={stats.pending_count > 0 ? "warning" : undefined}
      />
      <StatCard
        label="Minutos totales"
        value={`${stats.total_delay_minutes} min`}
        sub={`Media por retraso: ${stats.avg_delay_minutes} min`}
      />
      <StatCard
        label="No justificados"
        value={String(stats.unjustified_count)}
        sub={`${stats.justified_count} justificados · ${stats.ignored_count} ignorados`}
        highlight={stats.unjustified_count > 0 ? "danger" : undefined}
      />
      <StatCard
        label="Puntualidad"
        value={`${stats.punctuality_rate.toFixed(1)}%`}
        highlight={
          stats.punctuality_rate >= 95
            ? "success"
            : stats.punctuality_rate >= 80
              ? "warning"
              : "danger"
        }
      />
    </div>
  );
}

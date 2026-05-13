"use client";

import { CheckCircle, Clock, Users, XCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatPercent, formatSeconds } from "@/lib/format";
import type { DashboardSummary } from "@/types/dashboard";

interface MetricsGridProps {
  data?: DashboardSummary;
  loading?: boolean;
}

export function MetricsGrid({ data, loading }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard
        label="Total empleados"
        value={data?.total_employees ?? 0}
        icon={<Users className="h-5 w-5" />}
        iconColor="blue"
        loading={loading}
      />
      <StatCard
        label="Fichados ahora"
        value={data?.total_clocked_in ?? 0}
        icon={<CheckCircle className="h-5 w-5" />}
        iconColor="green"
        loading={loading}
      />
      <StatCard
        label="Fuera del turno"
        value={data?.total_clocked_out ?? 0}
        icon={<XCircle className="h-5 w-5" />}
        iconColor="gray"
        loading={loading}
      />
      <StatCard
        label="Horas registradas"
        value={data?.kpis ? formatSeconds(data.kpis.total_worked_seconds) : "—"}
        icon={<Clock className="h-5 w-5" />}
        iconColor="orange"
        trend={
          data?.kpis
            ? `${formatPercent(data.kpis.active_ratio)} presentes ahora`
            : undefined
        }
        loading={loading}
      />
    </div>
  );
}

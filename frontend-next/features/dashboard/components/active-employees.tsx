"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/attendance";

interface ActiveEmployeesProps {
  statuses?: AttendanceStatus[];
  loading?: boolean;
}

function avatarColor(name: string): string {
  const colors = [
    "bg-violet-500/15 text-violet-600",
    "bg-blue-500/15 text-blue-600",
    "bg-emerald-500/15 text-emerald-600",
    "bg-amber-500/15 text-amber-600",
    "bg-pink-500/15 text-pink-600",
    "bg-cyan-500/15 text-cyan-600",
    "bg-orange-500/15 text-orange-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function ActiveEmployees({ statuses, loading }: ActiveEmployeesProps) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-xs flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">
            Empleados activos
          </h2>
          {!loading && (
            <p className="text-[12px] text-ink-xmuted mt-0.5">
              {statuses?.length ?? 0} fichados ahora
            </p>
          )}
        </div>
        {!loading && (
          <Badge variant="success">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
            {statuses?.length ?? 0} activos
          </Badge>
        )}
      </div>

      <div className="divide-y divide-border overflow-y-auto">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}

        {!loading && (!statuses || statuses.length === 0) && (
          <div className="flex flex-col items-center justify-center py-14 text-center px-5">
            <div className="h-10 w-10 rounded-full bg-surface-bg flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-ink-xmuted" />
            </div>
            <p className="text-[13px] font-medium text-ink-muted">
              Sin empleados activos
            </p>
            <p className="text-[12px] text-ink-xmuted mt-1">
              Nadie está trabajando ahora mismo.
            </p>
          </div>
        )}

        {!loading &&
          statuses?.map((status) => (
            <div
              key={status.employee.id}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted/40 transition-colors"
            >
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(status.employee.full_name)}`}
              >
                {getInitials(
                  status.employee.first_name,
                  status.employee.last_name,
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">
                  {status.employee.full_name}
                </p>
                {status.active_session && (
                  <p className="text-[11px] text-ink-xmuted mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot flex-shrink-0" />
                    Fichado desde{" "}
                    {formatTime(status.active_session.clock_in_time)}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-success-bg border border-success-border px-2 py-0.5 text-[10px] font-semibold text-success-DEFAULT uppercase tracking-wide flex-shrink-0">
                activo
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

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

export function ActiveEmployees({ statuses, loading }: ActiveEmployeesProps) {
  return (
    <div className="rounded-lg border border-border bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[14px] font-semibold text-ink">Trabajando ahora</h2>
        {!loading && (
          <Badge variant="success">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
            {statuses?.length ?? 0} activos
          </Badge>
        )}
      </div>

      <div className="divide-y divide-border">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-18" />
              </div>
            </div>
          ))}

        {!loading && (!statuses || statuses.length === 0) && (
          <p className="px-5 py-10 text-center text-[13px] text-ink-muted">
            Ningún empleado trabajando ahora mismo.
          </p>
        )}

        {!loading &&
          statuses?.map((status) => (
            <div
              key={status.employee.id}
              className="flex items-center gap-3 px-5 py-3"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-success-bg text-success-DEFAULT text-[11px] font-bold">
                {getInitials(
                  status.employee.first_name,
                  status.employee.last_name,
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">
                  {status.employee.full_name}
                </p>
                {status.employee.role_title && (
                  <p className="text-[11px] text-ink-muted">
                    {status.employee.role_title}
                  </p>
                )}
              </div>
              {status.active_session && (
                <div className="flex items-center gap-1 text-[11px] text-ink-xmuted tabular-nums">
                  <Clock className="h-3 w-3" />
                  {formatTime(status.active_session.clock_in_time)}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

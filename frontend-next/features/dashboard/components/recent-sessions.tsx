"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatSeconds } from "@/lib/format";
import type { SessionReport } from "@/types/attendance";

interface RecentSessionsProps {
  sessions?: SessionReport[];
  loading?: boolean;
}

export function RecentSessions({ sessions, loading }: RecentSessionsProps) {
  return (
    <div className="rounded-lg border border-border bg-white shadow-xs">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-[14px] font-semibold text-ink">Últimos fichajes</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
                Empleado
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
                Entrada
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
                Salida
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
                Duración
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-3">
                      <Skeleton className="h-3.5 w-20" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && (!sessions || sessions.length === 0) && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-[13px] text-ink-muted"
                >
                  Sin fichajes recientes.
                </td>
              </tr>
            )}

            {!loading &&
              sessions?.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-surface-muted/60 transition-colors duration-100"
                >
                  <td className="px-5 py-3 text-[13px] font-medium text-ink">
                    {s.employee?.full_name ?? s.employee_name ?? `Empleado ${s.employee_id.slice(0, 8)}`}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                    {formatDateTime(s.clock_in_time)}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                    {s.clock_out_time
                      ? formatDateTime(s.clock_out_time)
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                    {s.total_seconds ? formatSeconds(s.total_seconds) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {s.is_active ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="muted">Cerrado</Badge>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

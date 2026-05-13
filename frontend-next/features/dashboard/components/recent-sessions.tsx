"use client";

import { Globe, MonitorSmartphone, Smartphone, Hash, Settings2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatSeconds } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import type { SessionReport } from "@/types/attendance";

interface RecentSessionsProps {
  sessions?: SessionReport[];
  loading?: boolean;
  companyTimeZone?: string;
}

const METHOD_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  web: { icon: Globe, label: "Web" },
  kiosk: { icon: MonitorSmartphone, label: "Kiosk" },
  mobile: { icon: Smartphone, label: "Móvil" },
  pin: { icon: Hash, label: "PIN" },
  admin: { icon: Settings2, label: "Admin" },
};

function MethodBadge({ method }: { method?: string }) {
  if (!method) return <span className="text-[12px] text-ink-xmuted">—</span>;
  const config = METHOD_CONFIG[method] ?? { icon: Globe, label: method };
  const Icon = config.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-bg px-2 py-0.5 text-[11px] font-medium text-ink-muted">
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function RecentSessions({
  sessions,
  loading,
  companyTimeZone,
}: RecentSessionsProps) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">Fichajes recientes</h2>
          <p className="text-[12px] text-ink-xmuted mt-0.5">
            Últimas entradas y salidas registradas hoy
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/60">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-ink-xmuted uppercase tracking-wider">
                Empleado
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-xmuted uppercase tracking-wider">
                Entrada
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-xmuted uppercase tracking-wider">
                Salida
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-xmuted uppercase tracking-wider">
                Duración
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-xmuted uppercase tracking-wider">
                Método
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-xmuted uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </td>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <Skeleton className="h-3.5 w-16" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && (!sessions || sessions.length === 0) && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-14 text-center text-[13px] text-ink-muted"
                >
                  Sin fichajes recientes.
                </td>
              </tr>
            )}

            {!loading &&
              sessions?.map((s) => {
                const fullName =
                  s.employee?.full_name ??
                  s.employee_name ??
                  `Empleado ${s.employee_id.slice(0, 8)}`;
                const firstName =
                  s.employee?.first_name ?? fullName.split(" ")[0] ?? "";
                const lastName =
                  s.employee?.last_name ??
                  fullName.split(" ").slice(1).join(" ") ??
                  "";
                const initials =
                  s.employee?.initials ?? getInitials(firstName, lastName);

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-surface-muted/40 transition-colors duration-100"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {initials}
                        </div>
                        <span className="text-[13px] font-medium text-ink">
                          {fullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-ink-muted tabular-nums">
                      {formatDateTime(s.clock_in_time, companyTimeZone)}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-ink-muted tabular-nums">
                      {s.clock_out_time
                        ? formatDateTime(s.clock_out_time, companyTimeZone)
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-ink-muted tabular-nums">
                      {s.total_seconds ? formatSeconds(s.total_seconds) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <MethodBadge method={s.method} />
                    </td>
                    <td className="px-4 py-3.5">
                      {s.is_active ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="muted">Cerrado</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

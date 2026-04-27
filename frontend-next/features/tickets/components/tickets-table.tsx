"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { Ticket, TicketStatus } from "@/types/ticket";

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Abierta",
  in_review: "En revision",
  resolved: "Resuelta",
  rejected: "Rechazada",
};

const STATUS_VARIANT: Record<TicketStatus, "warning" | "success" | "danger" | "default"> = {
  open: "warning",
  in_review: "default",
  resolved: "success",
  rejected: "danger",
};

export function TicketsTable({
  tickets,
  loading,
  updatingId,
  onStatusChange,
}: {
  tickets?: Ticket[];
  loading?: boolean;
  updatingId?: string | null;
  onStatusChange?: (ticket: Ticket, status: TicketStatus) => void;
}) {
  const showActions = Boolean(onStatusChange);
  const columnCount = showActions ? 5 : 4;

  return (
    <div className="rounded-lg border border-border bg-white shadow-xs">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-[14px] font-semibold text-ink">
          Incidencias{" "}
          <span className="text-ink-xmuted font-normal">({tickets?.length ?? 0})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left">
              {["Titulo", "Fecha", "Estado", "Descripcion", ...(showActions ? ["Acciones"] : [])].map((header) => (
                <th key={header} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: columnCount }).map((__, j) => (
                    <td key={j} className="px-5 py-3">
                      <Skeleton className="h-3.5 w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && (!tickets || tickets.length === 0) && (
              <tr>
                <td colSpan={columnCount} className="px-5 py-10 text-center text-[13px] text-ink-muted">
                  No hay incidencias registradas.
                </td>
              </tr>
            )}
            {!loading &&
              tickets?.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-surface-muted/60 transition-colors duration-100">
                  <td className="px-5 py-3 text-[13px] font-semibold text-ink">{ticket.title}</td>
                  <td className="px-5 py-3 text-[13px] text-ink-muted tabular-nums">
                    {ticket.occurred_on ? formatDate(ticket.occurred_on) : formatDate(ticket.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_VARIANT[ticket.status] ?? "default"}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </td>
                  <td className="max-w-sm px-5 py-3 text-[13px] text-ink-muted truncate">
                    {ticket.description ?? "-"}
                  </td>
                  {showActions && (
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ticket.status === "open" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={updatingId === ticket.id}
                            onClick={() => onStatusChange?.(ticket, "in_review")}
                          >
                            Revisar
                          </Button>
                        )}
                        {ticket.status === "in_review" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={updatingId === ticket.id}
                              onClick={() => onStatusChange?.(ticket, "resolved")}
                            >
                              Resolver
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={updatingId === ticket.id}
                              onClick={() => onStatusChange?.(ticket, "rejected")}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

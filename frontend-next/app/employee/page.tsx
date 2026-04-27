"use client";

import { Clock, LogOut, TicketCheck, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useEmployeeSession, useLogout } from "@/hooks/use-auth";
import { useClockIn, useClockOut, useAttendanceHistory } from "@/hooks/use-attendance";
import { useTickets, useCreateTicket } from "@/hooks/use-tickets";
import { TicketForm } from "@/features/tickets/components/ticket-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { formatDateTime, formatSeconds } from "@/lib/format";
import type { TicketCreateRequest } from "@/types/ticket";

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  closed: "Cerrada",
};

export default function EmployeePage() {
  const session = useEmployeeSession();
  const logout = useLogout();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  // Backend scopes sessions to this employee automatically.
  const { data: openSessions, isLoading: statusLoading } = useAttendanceHistory({ status: "open" });
  const { data: tickets, isLoading: ticketsLoading } = useTickets();
  const createTicket = useCreateTicket();

  if (session.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session.error && session.error.status !== 401) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg p-6">
        <div className="max-w-md rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-DEFAULT">
          No se pudo validar tu sesion. Revisa la conexion con el backend.
        </div>
      </div>
    );
  }

  if (!session.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session.data.user.role !== "employee") return null;

  const activeSession = openSessions?.[0] ?? null;
  const isClockedIn = Boolean(activeSession);

  const handleClockIn = () => {
    clockIn.mutate(undefined, {
      onSuccess: (session) => {
        if (session.location_permission_status === "denied" || session.location_permission_status === "unavailable") {
          toast.warning("Entrada registrada. Ubicación no disponible — el fichaje se guardó sin localización.");
        } else {
          toast.success("Entrada registrada.");
        }
      },
      onError: (err) => toast.error((err as Error).message ?? "No se pudo registrar la entrada."),
    });
  };

  const handleClockOut = () => {
    clockOut.mutate(undefined, {
      onSuccess: (session) => {
        if (session.location_permission_status === "denied" || session.location_permission_status === "unavailable") {
          toast.warning("Salida registrada. Ubicación no disponible — el fichaje se guardó sin localización.");
        } else {
          toast.success("Salida registrada.");
        }
      },
      onError: (err) => toast.error((err as Error).message ?? "No se pudo registrar la salida."),
    });
  };

  const handleCreateTicket = (values: TicketCreateRequest) => {
    createTicket.mutate(values, {
      onSuccess: () => toast.success("Incidencia creada."),
      onError: () => toast.error("No se pudo crear la incidencia."),
    });
  };

  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-border bg-white/95 backdrop-blur-sm px-5">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-[13px] font-semibold text-ink leading-none">{session.data.user.full_name}</p>
            <p className="text-[11px] text-ink-xmuted mt-0.5">Empleado</p>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition-all duration-150 hover:bg-danger-bg hover:text-danger-DEFAULT"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[560px] space-y-4 p-5">
        {/* Clock in/out card */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Mi fichaje
            </CardTitle>
            <Badge variant={isClockedIn ? "success" : "muted"}>
              {isClockedIn ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
                  Trabajando
                </>
              ) : (
                "Sin fichar"
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusLoading ? (
              <div className="h-10 animate-pulse rounded-md bg-surface-bg" />
            ) : (
              <>
                {isClockedIn && activeSession && (
                  <div className="rounded-md border border-success-border bg-success-bg px-4 py-3 text-sm">
                    <p className="text-[13px] font-semibold text-success-DEFAULT">Trabajando desde</p>
                    <p className="text-[13px] text-ink-muted mt-0.5">
                      {formatDateTime(activeSession.clock_in_time)}
                    </p>
                    {activeSession.total_seconds != null && activeSession.total_seconds > 0 && (
                      <p className="text-[12px] text-ink-muted mt-0.5 tabular-nums">
                        {formatSeconds(activeSession.total_seconds)} trabajados
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    size="lg"
                    disabled={isClockedIn || clockIn.isPending}
                    loading={clockIn.isPending}
                    onClick={handleClockIn}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Entrada
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={!isClockedIn || clockOut.isPending}
                    loading={clockOut.isPending}
                    onClick={handleClockOut}
                  >
                    <Circle className="h-4 w-4" />
                    Salida
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Create ticket card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TicketCheck className="h-4 w-4 text-primary" />
              Nueva incidencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TicketForm onSubmit={handleCreateTicket} loading={createTicket.isPending} />
          </CardContent>
        </Card>

        {/* Own tickets */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle>Mis incidencias</CardTitle>
            <Badge variant="outline">{tickets?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-md bg-surface-bg" />
                ))}
              </div>
            ) : tickets && tickets.length > 0 ? (
              <div className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{ticket.title}</p>
                      {ticket.description && (
                        <p className="truncate text-[12px] text-ink-muted mt-0.5">{ticket.description}</p>
                      )}
                      {ticket.occurred_on && (
                        <p className="text-[11px] text-ink-xmuted mt-0.5 tabular-nums">{ticket.occurred_on}</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        ticket.status === "open"
                          ? "warning"
                          : ticket.status === "resolved"
                            ? "success"
                            : "muted"
                      }
                      className="shrink-0 mt-0.5"
                    >
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[13px] text-ink-muted">Sin incidencias registradas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

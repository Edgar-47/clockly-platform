"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Circle, Clock, History, LogOut, MapPin, TicketCheck } from "lucide-react";
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
import { employeesService } from "@/services/employees.service";
import type { AttendanceStatus } from "@/types/attendance";
import type { TicketCreateRequest, TicketStatus } from "@/types/ticket";

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Abierta",
  in_review: "En revision",
  resolved: "Resuelta",
  rejected: "Rechazada",
};

export default function EmployeePage() {
  const session = useEmployeeSession();
  const logout = useLogout();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const changePin = useMutation({
    mutationFn: () => employeesService.changeOwnPin({ current_pin: currentPin || undefined, new_pin: newPin }),
    onSuccess: () => {
      setCurrentPin("");
      setNewPin("");
      toast.success("PIN actualizado.");
    },
    onError: (error) => toast.error((error as Error).message ?? "No se pudo cambiar el PIN."),
  });

  // Backend scopes sessions to this employee automatically.
  const { data: openSessions, isLoading: statusLoading } = useAttendanceHistory({ status: "open" });
  const { data: recentSessions, isLoading: historyLoading } = useAttendanceHistory({ status: "closed", limit: 10 });
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
  const companyTimeZone = session.data.company.timezone;
  const hasGeolocation = session.data.company.has_geolocation;

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

  const handleChangePin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPin.length !== 4) {
      toast.error("El PIN debe tener 4 digitos.");
      return;
    }
    changePin.mutate();
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

      <div className="mx-auto max-w-[560px] space-y-4 p-4 sm:p-5">
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
                      {formatDateTime(activeSession.clock_in_time, companyTimeZone)}
                    </p>
                    {activeSession.total_seconds != null && activeSession.total_seconds > 0 && (
                      <p className="text-[12px] text-ink-muted mt-0.5 tabular-nums">
                        {formatSeconds(activeSession.total_seconds)} trabajados
                      </p>
                    )}
                  </div>
                )}

                {hasGeolocation && (
                  <div className="flex gap-2 rounded-md border border-border bg-surface-bg px-3 py-2 text-[12px] text-ink-muted">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Tu ubicacion se usara solo para validar el fichaje. Puedes denegar el permiso y el fichaje se registrara igualmente.</span>
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
            <CardTitle>PIN de kiosk</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePin} className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="PIN actual"
                inputMode="numeric"
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
              <input
                value={newPin}
                onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Nuevo PIN"
                inputMode="numeric"
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
              <Button type="submit" loading={changePin.isPending}>
                Cambiar
              </Button>
            </form>
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
                            : ticket.status === "rejected"
                              ? "danger"
                              : "default"
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

        {/* Attendance history */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Últimos fichajes
            </CardTitle>
            <Badge variant="outline">{recentSessions?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-md bg-surface-bg" />
                ))}
              </div>
            ) : recentSessions && recentSessions.length > 0 ? (
              <div className="divide-y divide-border">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-ink-xmuted" />
                        <p className="text-[13px] font-medium text-ink tabular-nums">
                          {formatDateTime(session.clock_in_time, companyTimeZone)}
                        </p>
                      </div>
                      {session.clock_out_time && (
                        <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                          Salida: {formatDateTime(session.clock_out_time, companyTimeZone)}
                        </p>
                      )}
                    </div>
                    {session.total_seconds != null && session.total_seconds > 0 && (
                      <span className="shrink-0 rounded-md bg-surface-bg px-2 py-1 text-[12px] font-semibold text-ink-muted tabular-nums">
                        {formatSeconds(session.total_seconds)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[13px] text-ink-muted">Sin fichajes recientes.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

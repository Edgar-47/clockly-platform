"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketForm } from "@/features/tickets/components/ticket-form";
import { TicketsTable } from "@/features/tickets/components/tickets-table";
import { useCreateTicket, useTickets, useUpdateTicketStatus } from "@/hooks/use-tickets";
import type { Ticket, TicketCreateRequest, TicketStatus } from "@/types/ticket";

export default function TicketsPage() {
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const tickets = useTickets(status === "all" ? {} : { status });
  const create = useCreateTicket();
  const updateStatus = useUpdateTicketStatus();

  const handleCreate = (values: TicketCreateRequest) => {
    create.mutate(values, {
      onSuccess: () => toast.success("Incidencia creada."),
      onError: () => toast.error("No se pudo crear la incidencia."),
    });
  };

  const handleStatusChange = (ticket: Ticket, nextStatus: TicketStatus) => {
    updateStatus.mutate(
      { id: ticket.id, payload: { status: nextStatus } },
      {
        onSuccess: () => toast.success("Incidencia actualizada."),
        onError: (error) => toast.error((error as Error).message ?? "No se pudo actualizar la incidencia."),
      },
    );
  };

  return (
    <>
      <Topbar title="Incidencias" />
      <div className="grid gap-5 p-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva incidencia</CardTitle>
            <CardDescription>Registra tickets internos, ausencias o notas operativas.</CardDescription>
          </CardHeader>
          <CardContent>
            <TicketForm onSubmit={handleCreate} loading={create.isPending} />
          </CardContent>
        </Card>
        <div className="space-y-3">
          <div className="flex justify-end">
            <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abiertas</SelectItem>
                <SelectItem value="in_review">En revisión</SelectItem>
                <SelectItem value="resolved">Resueltas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TicketsTable
            tickets={tickets.data}
            loading={tickets.isLoading}
            updatingId={updateStatus.isPending ? updateStatus.variables?.id ?? null : null}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>
    </>
  );
}

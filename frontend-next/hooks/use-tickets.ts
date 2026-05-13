"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ticketsService } from "@/services/tickets.service";
import type { TicketCreateRequest, TicketFilters, TicketUpdateRequest } from "@/types/ticket";

export const ticketKeys = {
  all: ["tickets"] as const,
  list: (filters: TicketFilters) => ["tickets", filters] as const,
};

export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => ticketsService.list(filters),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TicketCreateRequest) => ticketsService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TicketUpdateRequest }) =>
      ticketsService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}

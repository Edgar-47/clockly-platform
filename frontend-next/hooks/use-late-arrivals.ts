"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lateArrivalsService } from "@/services/late-arrivals.service";
import type {
  LateArrivalFilters,
  LateArrivalStatus,
  LateArrivalUpdateStatus,
} from "@/types/late-arrival";

export const lateArrivalKeys = {
  all: ["late-arrivals"] as const,
  lists: () => ["late-arrivals", "list"] as const,
  list: (filters: LateArrivalFilters) => ["late-arrivals", "list", filters] as const,
  detail: (id: string) => ["late-arrivals", id] as const,
  stats: (filters: object) => ["late-arrivals", "stats", filters] as const,
  charts: (filters: object) => ["late-arrivals", "charts", filters] as const,
};

export function useLateArrivals(filters: LateArrivalFilters = {}) {
  return useQuery({
    queryKey: lateArrivalKeys.list(filters),
    queryFn: () => lateArrivalsService.list(filters),
  });
}

export function useLateArrival(id: string) {
  return useQuery({
    queryKey: lateArrivalKeys.detail(id),
    queryFn: () => lateArrivalsService.get(id),
    enabled: Boolean(id),
  });
}

export function useLateArrivalStats(
  filters: { employee_id?: string; date_from?: string; date_to?: string } = {},
) {
  return useQuery({
    queryKey: lateArrivalKeys.stats(filters),
    queryFn: () => lateArrivalsService.stats(filters),
  });
}

export function useLateArrivalCharts(
  filters: { employee_id?: string; date_from?: string; date_to?: string } = {},
) {
  return useQuery({
    queryKey: lateArrivalKeys.charts(filters),
    queryFn: () => lateArrivalsService.charts(filters),
  });
}

export function useUpdateLateArrivalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LateArrivalUpdateStatus }) =>
      lateArrivalsService.updateStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lateArrivalKeys.all });
    },
  });
}

export function useExportLateArrivals() {
  return useMutation({
    mutationFn: (filters: {
      employee_id?: string;
      status?: LateArrivalStatus;
      date_from?: string;
      date_to?: string;
    }) => lateArrivalsService.export(filters),
  });
}

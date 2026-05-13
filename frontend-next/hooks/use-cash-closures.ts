"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cashClosuresService } from "@/services/cash-closures.service";
import type {
  CashClosureAnalyticsFilters,
  CashClosureCreateRequest,
  CashClosureFilters,
  CashClosureShift,
  CashClosureUpdateRequest,
} from "@/types/cash-closure";

export const cashClosureKeys = {
  all: ["cash-closures"] as const,
  list: (filters: CashClosureFilters) => ["cash-closures", "list", filters] as const,
  detail: (id: string) => ["cash-closures", id] as const,
  stats: (filters: CashClosureAnalyticsFilters) => ["cash-closures", "stats", filters] as const,
  charts: (filters: CashClosureAnalyticsFilters) => ["cash-closures", "charts", filters] as const,
};

export function useCashClosures(filters: CashClosureFilters = {}, enabled = true) {
  return useQuery({
    queryKey: cashClosureKeys.list(filters),
    queryFn: () => cashClosuresService.list(filters),
    enabled,
  });
}

export function useCashClosure(id: string) {
  return useQuery({
    queryKey: cashClosureKeys.detail(id),
    queryFn: () => cashClosuresService.get(id),
    enabled: Boolean(id),
  });
}

export function useCashClosureStats(filters: CashClosureAnalyticsFilters = {}, enabled = true) {
  return useQuery({
    queryKey: cashClosureKeys.stats(filters),
    queryFn: () => cashClosuresService.stats(filters),
    enabled,
  });
}

export function useCashClosureCharts(filters: CashClosureAnalyticsFilters = {}, enabled = true) {
  return useQuery({
    queryKey: cashClosureKeys.charts(filters),
    queryFn: () => cashClosuresService.charts(filters),
    enabled,
  });
}

export function useCreateCashClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CashClosureCreateRequest) => cashClosuresService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashClosureKeys.all }),
  });
}

export function useUpdateCashClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CashClosureUpdateRequest }) =>
      cashClosuresService.update(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: cashClosureKeys.all });
      qc.invalidateQueries({ queryKey: cashClosureKeys.detail(vars.id) });
    },
  });
}

export function usePrefillCashClosure() {
  return useMutation({
    mutationFn: (filters: { date?: string; shift?: CashClosureShift; location_id?: string }) =>
      cashClosuresService.prefill(filters),
  });
}

export function useExportCashClosures() {
  return useMutation({
    mutationFn: (filters: CashClosureFilters & { format: "xlsx" | "csv" }) =>
      cashClosuresService.export(filters),
  });
}

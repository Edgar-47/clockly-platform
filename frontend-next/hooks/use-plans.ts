"use client";

import { useQuery } from "@tanstack/react-query";
import { plansService } from "@/services/plans.service";

export const planKeys = {
  all: ["plans"] as const,
  current: ["plans", "current"] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: plansService.list,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCurrentPlan() {
  return useQuery({
    queryKey: planKeys.current,
    queryFn: plansService.current,
    staleTime: 60_000,
  });
}

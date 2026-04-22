"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardService.summary,
    // 30 s stale window — fast enough for an admin dashboard, avoids thrashing.
    staleTime: 30_000,
    // Poll every 2 min instead of every 60 s: 4× fewer backend round-trips per user.
    // Real-time clock-in/out actions already invalidate the cache immediately.
    refetchInterval: 120_000,
  });
}

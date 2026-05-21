"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { authKeys } from "@/hooks/use-auth";
import type { MePayload } from "@/types/auth";

export function useDashboard() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => {
      // Reuse the already-cached session data instead of making a fresh /auth/me
      // HTTP request. Falls back to fetching if cache is empty (e.g. on first load
      // before useSession resolves, or after a cache clear).
      const cachedSession = queryClient.getQueryData<MePayload>(authKeys.me);
      return dashboardService.summary(cachedSession);
    },
    // 30 s stale window — fast enough for an admin dashboard, avoids thrashing.
    staleTime: 30_000,
    // Poll every 2 min instead of every 60 s: 4× fewer backend round-trips per user.
    // Real-time clock-in/out actions already invalidate the cache immediately.
    refetchInterval: 120_000,
  });
}

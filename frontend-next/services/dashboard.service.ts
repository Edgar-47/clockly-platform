import { api } from "@/lib/api-client";
import type { DashboardSummary } from "@/types/dashboard";

export const dashboardService = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
};

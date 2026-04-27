import { api } from "@/lib/api-client";
import type { CompanyPlanContext, PlanListResponse } from "@/types/plan";

export const plansService = {
  list: () => api.get<PlanListResponse>("/plans").then((response) => response.items),
  current: () => api.get<CompanyPlanContext>("/plans/current"),
};

import { api } from "@/lib/api-client";
import type { PlanType } from "@/types/plan";

export const billingService = {
  checkout: (plan_type: Exclude<PlanType, "free">) =>
    api.post<{ url: string }>("/billing/checkout", { plan_type }),

  portal: (return_url?: string) =>
    api.post<{ url: string }>("/billing/portal", { return_url }),
};

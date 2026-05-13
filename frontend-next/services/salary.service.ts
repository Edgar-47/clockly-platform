import { api } from "@/lib/api-client";
import type {
  SalaryCalculation,
  SalaryProfile,
  SalaryProfileCreateRequest,
  SalaryProfileUpdateRequest,
  StoredSalaryCalculation,
} from "@/types/salary";

export const salaryService = {
  listProfiles: (employeeId?: string) => {
    const params = new URLSearchParams();
    if (employeeId) params.set("employee_id", employeeId);
    const qs = params.toString();
    return api.get<{ items: SalaryProfile[] }>(`/salary-profiles${qs ? `?${qs}` : ""}`).then((r) => r.items);
  },

  employeeProfiles: (employeeId: string) =>
    api.get<{ items: SalaryProfile[] }>(`/salary-profiles/${employeeId}`).then((r) => r.items),

  createProfile: (payload: SalaryProfileCreateRequest) =>
    api.post<SalaryProfile>("/salary-profiles", payload),

  updateProfile: (id: string, payload: SalaryProfileUpdateRequest) =>
    api.patch<SalaryProfile>(`/salary-profiles/${id}`, payload),

  calculate: (employeeId: string, periodStart: string, periodEnd: string) => {
    const params = new URLSearchParams({
      employee_id: employeeId,
      from: periodStart,
      to: periodEnd,
    });
    return api.get<SalaryCalculation>(`/salary-calculations?${params}`);
  },

  generate: (employeeId: string, periodStart: string, periodEnd: string) =>
    api.post<StoredSalaryCalculation>("/salary-calculations/generate", {
      employee_id: employeeId,
      period_start: periodStart,
      period_end: periodEnd,
    }),

  downloadCalculation: (format: "excel" | "pdf", employeeId: string, periodStart: string, periodEnd: string) => {
    const params = new URLSearchParams({
      format,
      employee_id: employeeId,
      from: periodStart,
      to: periodEnd,
    });
    return api.download(`/exports/salary-calculation?${params}`);
  },
};

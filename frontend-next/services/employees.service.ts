import { api } from "@/lib/api-client";
import type { Employee, EmployeeCreateRequest, EmployeeUpdateRequest } from "@/types/employee";

export const employeesService = {
  list: () =>
    api.get<{ items: Employee[] }>("/employees").then((r) => r.items),

  get: (id: number) =>
    api.get<{ employee: Employee }>(`/employees/${id}`).then((r) => r.employee),

  create: (payload: EmployeeCreateRequest) =>
    api
      .post<{ employee: Employee }>("/employees", payload)
      .then((r) => r.employee),

  update: (id: number, payload: EmployeeUpdateRequest) =>
    api
      .put<{ employee: Employee }>(`/employees/${id}`, payload)
      .then((r) => r.employee),

  deactivate: (id: number) =>
    api.post<{ ok: boolean }>(`/employees/${id}/deactivate`),
};

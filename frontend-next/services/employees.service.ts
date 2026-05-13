import { api } from "@/lib/api-client";
import type { CsvImportResult, Employee, EmployeeCreateRequest, EmployeeUpdateRequest } from "@/types/employee";

function normalizeEmployee(employee: Omit<Employee, "full_name" | "initials"> & Partial<Employee>): Employee {
  const fullName = employee.full_name ?? `${employee.first_name} ${employee.last_name}`.trim();
  const initials =
    employee.initials ??
    `${employee.first_name?.[0] ?? ""}${employee.last_name?.[0] ?? ""}`.toUpperCase();
  return {
    ...employee,
    full_name: fullName,
    initials,
  } as Employee;
}

export const employeesService = {
  list: () =>
    api.get<{ items: Employee[] }>("/employees").then((r) => r.items.map(normalizeEmployee)),

  get: (id: string) =>
    api.get<Employee>(`/employees/${id}`).then(normalizeEmployee),

  create: (payload: EmployeeCreateRequest) =>
    api.post<Employee>("/employees", payload).then(normalizeEmployee),

  update: (id: string, payload: EmployeeUpdateRequest) =>
    api.patch<Employee>(`/employees/${id}`, payload).then(normalizeEmployee),

  setActive: (id: string, isActive: boolean) =>
    api.patch<Employee>(`/employees/${id}`, { is_active: isActive }).then(normalizeEmployee),

  resetPin: (id: string, pin: string | null) =>
    api.post<Employee>(`/employees/${id}/pin`, { pin }).then(normalizeEmployee),

  changeOwnPin: (payload: { current_pin?: string; new_pin: string }) =>
    api.post<Employee>("/employees/me/pin", payload).then(normalizeEmployee),

  previewCsv: (file: File): Promise<CsvImportResult> => {
    const form = new FormData();
    form.append("file", file);
    return api.postForm<CsvImportResult>("/employees/csv-preview", form);
  },

  importCsv: (file: File): Promise<CsvImportResult> => {
    const form = new FormData();
    form.append("file", file);
    return api.postForm<CsvImportResult>("/employees/csv-import", form);
  },
};

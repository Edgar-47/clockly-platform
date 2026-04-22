import { api } from "@/lib/api-client";
import type {
  AttendanceStatus,
  ClockRequest,
  SessionReport,
  AttendanceHistoryFilters,
} from "@/types/attendance";
import type { Employee } from "@/types/employee";
import { employeesService } from "./employees.service";

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function nameParts(fullName: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function sessionEmployee(session: SessionReport) {
  const fullName =
    session.employee?.full_name ??
    session.employee_name ??
    `Empleado ${session.employee_id.slice(0, 8)}`;
  const fallback = nameParts(fullName);
  const firstName = session.employee?.first_name ?? fallback.firstName;
  const lastName = session.employee?.last_name ?? fallback.lastName;

  return {
    id: session.employee?.id ?? session.employee_id,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    initials: session.employee?.initials ?? initials(firstName, lastName),
    role: "employee",
    role_title: session.employee?.role_title ?? null,
  };
}

function normalizeSession(session: SessionReport): SessionReport {
  const employee = session.employee ? sessionEmployee(session) : undefined;
  return {
    ...session,
    clock_in_time: session.clock_in_time ?? session.clock_in,
    clock_out_time: session.clock_out_time ?? session.clock_out,
    is_active: session.is_active ?? session.status === "open",
    total_seconds: session.total_seconds ?? session.duration_seconds,
    employee_name: employee?.full_name ?? session.employee_name,
    employee_initials: employee?.initials ?? session.employee_initials,
    employee: employee
      ? {
          id: employee.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          full_name: employee.full_name,
          initials: employee.initials,
          role_title: employee.role_title,
        }
      : session.employee,
  };
}

export const attendanceService = {
  // prefetchedEmployees: when callers already have the employee list (e.g. the
  // dashboard), pass it here to skip the redundant GET /employees request.
  current: async (prefetchedEmployees?: Employee[]) => {
    const [employees, sessions] = await Promise.all([
      prefetchedEmployees ? Promise.resolve(prefetchedEmployees) : employeesService.list(),
      attendanceService.history({ status: "open" }),
    ]);
    const openByEmployeeId = new Map(
      sessions
        .filter((session) => session.is_active)
        .map((session) => [session.employee_id, session]),
    );
    const statuses = employees
      .filter((employee) => employee.is_active)
      .map((employee): AttendanceStatus => {
        const active = openByEmployeeId.get(employee.id) ?? null;
        return {
          employee: {
            id: employee.id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            full_name: employee.full_name,
            initials: employee.initials,
            role: "employee",
            role_title: employee.role_title,
          },
          is_clocked_in: Boolean(active),
          active_session: active,
          last_session: null,
        };
      });
    const knownEmployeeIds = new Set(statuses.map((status) => status.employee.id));
    for (const session of sessions) {
      if (knownEmployeeIds.has(session.employee_id)) continue;
      const employee = sessionEmployee(session);
      statuses.push({
        employee,
        is_clocked_in: true,
        active_session: session,
        last_session: null,
      });
    }
    return statuses;
  },

  clockIn: (payload?: ClockRequest) =>
    api.post<SessionReport>("/attendance/clock-in", payload).then(normalizeSession),

  clockOut: (payload?: ClockRequest) =>
    api.post<SessionReport>("/attendance/clock-out", payload).then(normalizeSession),

  history: (filters: AttendanceHistoryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.employee_id)
      params.set("employee_id", String(filters.employee_id));
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return api
      .get<{ items: SessionReport[] }>(
        `/attendance/sessions${qs ? `?${qs}` : ""}`,
      )
      .then((r) => r.items.map(normalizeSession));
  },

  exportUrl: (format: "excel" | "pdf", filters: AttendanceHistoryFilters = {}) => {
    const params = new URLSearchParams({ format });
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.employee_id) params.set("employee_id", filters.employee_id);
    if (filters.status) params.set("status", filters.status);
    return `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8010"}/exports/attendance?${params}`;
  },
};

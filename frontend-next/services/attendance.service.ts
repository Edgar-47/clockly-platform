import { api } from "@/lib/api-client";
import type {
  AttendanceStatus,
  ClockRequest,
  AttendanceSession,
  SessionReport,
  AttendanceHistoryFilters,
} from "@/types/attendance";

export const attendanceService = {
  current: () =>
    api
      .get<{ items: AttendanceStatus[] }>("/attendance")
      .then((r) => r.items),

  clockIn: (payload?: ClockRequest) =>
    api
      .post<{ session: AttendanceSession }>("/attendance/clock-in", payload)
      .then((r) => r.session),

  clockOut: (payload?: ClockRequest) =>
    api
      .post<{ session: AttendanceSession }>("/attendance/clock-out", payload)
      .then((r) => r.session),

  history: (filters: AttendanceHistoryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.employee_id)
      params.set("employee_id", String(filters.employee_id));
    if (filters.is_active != null)
      params.set("is_active", String(filters.is_active));
    if (filters.incident_filter)
      params.set("incident_filter", filters.incident_filter);
    const qs = params.toString();
    return api
      .get<{ items: SessionReport[] }>(
        `/attendance/history${qs ? `?${qs}` : ""}`,
      )
      .then((r) => r.items);
  },
};

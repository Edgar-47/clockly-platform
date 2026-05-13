import { api } from "@/lib/api-client";
import type { DashboardSummary, MetricsOverview } from "@/types/dashboard";
import type { MePayload } from "@/types/auth";
import { attendanceService } from "./attendance.service";
import { employeesService } from "./employees.service";

export const dashboardService = {
  summary: async (): Promise<DashboardSummary> => {
    // Fetch session, metrics, employees and session history in parallel (4 requests).
    // Then derive attendance statuses from the already-fetched employee list
    // to avoid a redundant GET /employees inside attendanceService.current().
    const [me, metrics, employees, sessions] = await Promise.all([
      api.get<MePayload>("/auth/me"),
      api.get<MetricsOverview>("/metrics/overview"),
      employeesService.list(),
      attendanceService.history(),
    ]);
    const statuses = await attendanceService.current(employees);

    const activeEmployees = employees.filter((e) => e.is_active);
    const clockedIn = statuses.filter((s) => s.is_clocked_in);
    const recentSessions = sessions
      .filter((session) => !session.is_active)
      .slice(0, 8);

    return {
      business: {
        id: me.company.id,
        name: me.company.name,
        role: me.user.role,
        timezone: me.company.timezone,
      },
      usage: {
        plan: {
          code: me.company.plan_type,
          name: me.company.plan_name,
          max_employees: me.company.max_employees,
          has_exports: me.company.has_exports,
          has_advanced_filters: me.company.has_advanced_filters,
          has_multi_location: me.company.has_multi_location,
          has_geolocation: me.company.has_geolocation,
          has_admin_reports: me.company.has_admin_reports,
          has_support: me.company.has_support,
        },
        employee_count: activeEmployees.length,
      },
      total_employees: activeEmployees.length,
      total_clocked_in: clockedIn.length,
      total_clocked_out: Math.max(0, activeEmployees.length - clockedIn.length),
      clocked_in_statuses: clockedIn,
      recent_sessions: recentSessions,
      kpis: {
        total_worked_seconds: metrics.worked_seconds,
        active_ratio: activeEmployees.length > 0 ? clockedIn.length / activeEmployees.length : 0,
        top_worker: metrics.employees[0]?.employee_name ?? null,
        open_sessions: metrics.open_sessions,
      },
      metrics,
    };
  },
};

import { api } from "@/lib/api-client";
import type { DashboardSummary, MetricsOverview } from "@/types/dashboard";
import type { MePayload } from "@/types/auth";
import { attendanceService } from "./attendance.service";
import { employeesService } from "./employees.service";

export const dashboardService = {
  summary: async (): Promise<DashboardSummary> => {
    // Fetch metrics, employees and session history in parallel (3 requests).
    // Then derive attendance statuses from the already-fetched employee list
    // to avoid a redundant GET /employees inside attendanceService.current().
    const [me, metrics, employees, sessions] = await Promise.all([
      api.get<MePayload>("/auth/me"),
      api.get<MetricsOverview>("/metrics/overview"),
      employeesService.list(),
      attendanceService.history(),
    ]);
    const statuses = await attendanceService.current(employees);

    const clockedIn = statuses.filter((s) => s.is_clocked_in);
    const recentSessions = sessions
      .filter((session) => !session.is_active)
      .slice(0, 8);

    return {
      business: {
        id: me.company.id,
        name: me.company.name,
        role: me.user.role,
      },
      usage: {
        plan: {
          code: "mvp",
          name: "MVP",
          max_employees: 50,
          max_admins: 5,
        },
        employee_count: employees.filter((employee) => employee.is_active).length,
        admin_count: ["owner", "admin", "manager"].includes(me.user.role) ? 1 : 0,
      },
      total_employees: employees.filter((employee) => employee.is_active).length,
      total_clocked_in: clockedIn.length,
      total_clocked_out: Math.max(0, employees.filter((employee) => employee.is_active).length - clockedIn.length),
      clocked_in_statuses: clockedIn,
      recent_sessions: recentSessions,
      kpis: {
        total_hours_today: metrics.worked_seconds,
        total_hours_week: metrics.worked_seconds,
        total_hours_month: metrics.worked_seconds,
        month_overtime_seconds: 0,
        avg_hours_per_day: metrics.worked_seconds,
        attendance_rate: employees.length ? clockedIn.length / employees.length : 0,
        total_incidents: 0,
        top_worker_this_week: metrics.employees[0]?.employee_name ?? null,
        busiest_hour_today: null,
        busiest_concurrent_today: metrics.open_sessions,
      },
      metrics,
    };
  },
};

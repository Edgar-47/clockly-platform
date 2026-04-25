import type { AttendanceStatus, SessionReport } from "./attendance";

export interface DashboardKPIs {
  /** Total seconds worked in the period returned by /metrics/overview (no date filter = all time). */
  total_worked_seconds: number;
  /** Fraction of active employees currently clocked in (open sessions / active employees). */
  active_ratio: number;
  /** Employee with the highest worked_seconds in the metrics period. */
  top_worker?: string | null;
  /** Number of currently open attendance sessions. */
  open_sessions: number;
}

export interface PlanUsage {
  plan: {
    code: string;
    name: string;
    max_employees: number | null;
    has_exports: boolean;
    has_advanced_filters: boolean;
    has_multi_location: boolean;
    has_admin_reports: boolean;
    has_support: boolean;
  };
  employee_count: number;
}

export interface DashboardSummary {
  business: {
    id: string;
    name: string;
    role: string;
  } | null;
  usage: PlanUsage | null;
  total_employees: number;
  total_clocked_in: number;
  total_clocked_out: number;
  clocked_in_statuses: AttendanceStatus[];
  recent_sessions: SessionReport[];
  kpis: DashboardKPIs | null;
  metrics: MetricsOverview | null;
}

export interface MetricsOverview {
  worked_seconds: number;
  open_sessions: number;
  active_employees: number;
  employees: Array<{
    employee_id: string;
    employee_name: string;
    worked_seconds: number;
    closed_sessions: number;
  }>;
}

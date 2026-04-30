export type LateArrivalStatus = "pending" | "justified" | "unjustified" | "ignored"

export type ClockInMethod = "web" | "mobile" | "kiosk" | "pin"

export interface LateArrivalEmployee {
  id: string
  first_name: string
  last_name: string
}

export interface LateArrivalReviewer {
  id: string
  full_name: string
}

export interface LateArrival {
  id: string
  company_id: string
  employee_id: string
  attendance_session_id: string
  schedule_id: string | null

  date: string
  scheduled_start_time: string
  actual_clock_in_time: string
  delay_minutes_total: number
  delay_minutes_after_grace: number
  grace_period_minutes: number
  clock_in_method: ClockInMethod | null

  status: LateArrivalStatus
  justification_text: string | null
  internal_notes: string | null

  reviewed_by_user_id: string | null
  reviewed_at: string | null
  is_session_corrected: boolean

  created_at: string
  updated_at: string

  employee: LateArrivalEmployee | null
  reviewed_by: LateArrivalReviewer | null
}

export interface LateArrivalListResponse {
  items: LateArrival[]
  total: number
  limit: number
  offset: number
}

export interface LateArrivalFilters {
  employee_id?: string
  status?: LateArrivalStatus
  date_from?: string
  date_to?: string
  min_delay_minutes?: number
  max_delay_minutes?: number
  limit?: number
  offset?: number
}

export interface LateArrivalStats {
  total_count: number
  pending_count: number
  justified_count: number
  unjustified_count: number
  ignored_count: number
  total_delay_minutes: number
  avg_delay_minutes: number
  punctuality_rate: number
}

export interface LateArrivalChartPoint {
  label: string
  count: number
  total_minutes: number
}

export interface LateArrivalEmployeeRank {
  employee_id: string
  employee_name: string
  count: number
  total_minutes: number
  avg_minutes: number
}

export interface LateArrivalChartsResponse {
  by_day: LateArrivalChartPoint[]
  by_weekday: LateArrivalChartPoint[]
  by_month: LateArrivalChartPoint[]
  top_employees: LateArrivalEmployeeRank[]
}

export interface LateArrivalUpdateStatus {
  status: LateArrivalStatus
  justification_text?: string | null
  internal_notes?: string | null
}

// ── Display label maps ─────────────────────────────────────────────────────

export const STATUS_LABELS: Record<LateArrivalStatus, string> = {
  pending: "Pendiente",
  justified: "Justificado",
  unjustified: "No justificado",
  ignored: "Ignorado",
}

export const STATUS_COLORS: Record<LateArrivalStatus, string> = {
  pending: "warning",
  justified: "success",
  unjustified: "danger",
  ignored: "muted",
}

export const METHOD_LABELS: Record<ClockInMethod, string> = {
  web: "Web",
  mobile: "Móvil",
  kiosk: "Kiosco",
  pin: "PIN",
}

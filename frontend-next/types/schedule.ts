export type ScheduleType = "none" | "fixed" | "weekly_custom" | "flexible_window";

export interface ScheduleRule {
  id: string;
  weekday: number; // 0=Mon, 6=Sun
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
  entry_window_start: string | null;
  entry_window_end: string | null;
  exit_window_start: string | null;
  exit_window_end: string | null;
  grace_minutes: number | null;
}

export interface Schedule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  schedule_type: ScheduleType;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  entry_time: string | null;
  exit_time: string | null;
  break_minutes: number;
  entry_window_start: string | null;
  entry_window_end: string | null;
  exit_window_start: string | null;
  exit_window_end: string | null;
  grace_minutes: number | null;
  net_hours: number;
  weekly_hours: number;
  employee_count: number;
  rules: ScheduleRule[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleRuleCreate {
  weekday: number;
  is_working_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  entry_window_start?: string | null;
  entry_window_end?: string | null;
  exit_window_start?: string | null;
  exit_window_end?: string | null;
  grace_minutes?: number | null;
}

export interface ScheduleCreate {
  name: string;
  description?: string | null;
  schedule_type: ScheduleType;
  is_active?: boolean;
  grace_minutes?: number | null;
  // FIXED
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  entry_time?: string | null;
  exit_time?: string | null;
  break_minutes?: number;
  // FLEXIBLE_WINDOW
  entry_window_start?: string | null;
  entry_window_end?: string | null;
  exit_window_start?: string | null;
  exit_window_end?: string | null;
  // WEEKLY_CUSTOM + FLEXIBLE_WINDOW per-day
  rules?: ScheduleRuleCreate[];
}

export type ScheduleUpdate = Partial<ScheduleCreate>;

export interface ScheduleListResponse {
  items: Schedule[];
  total: number;
}

export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
export const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"] as const;

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  none: "Sin horario",
  fixed: "Horario fijo",
  weekly_custom: "Horario semanal personalizado",
  flexible_window: "Ventana flexible",
};

export const SCHEDULE_TYPE_DESCRIPTIONS: Record<ScheduleType, string> = {
  none: "No se calcularán retrasos automáticos.",
  fixed: "Mismo horario todos los días seleccionados.",
  weekly_custom: "Horario diferente para cada día de la semana.",
  flexible_window: "Ventana de entrada permitida. Se marca tarde si llega fuera del rango.",
};

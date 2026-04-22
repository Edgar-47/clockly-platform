export type IncidentType =
  | "late_arrival"
  | "early_departure"
  | "absence"
  | "overtime"
  | null;

export interface AttendanceSession {
  id: number;
  business_id: string;
  user_id: number;
  clock_in_time: string;
  clock_out_time: string | null;
  is_active: boolean;
  total_seconds: number | null;
  exit_note: string | null;
  incident_type: IncidentType;
}

export interface SessionReport extends AttendanceSession {
  employee?: {
    id: number;
    full_name: string;
    initials: string;
  };
  total_hours?: number;
}

export interface AttendanceStatus {
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    initials: string;
    role: string;
    role_title: string | null;
  };
  is_clocked_in: boolean;
  active_session: AttendanceSession | null;
  last_session: AttendanceSession | null;
}

export interface ClockRequest {
  employee_id?: number;
  exit_note?: string;
  incident_type?: IncidentType;
}

export interface AttendanceHistoryFilters {
  date_from?: string;
  date_to?: string;
  employee_id?: number;
  is_active?: 0 | 1;
  incident_filter?: string;
}

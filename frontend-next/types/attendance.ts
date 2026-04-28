export type IncidentType =
  | "late_arrival"
  | "early_departure"
  | "absence"
  | "overtime"
  | null;

export interface AttendanceSession {
  id: string;
  company_id: string;
  employee_id: string;
  user_id: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_seconds: number | null;
  status: "open" | "closed" | "void";
  method: "web" | "kiosk" | "mobile" | "pin" | "admin";
  notes: string | null;
  company_timezone?: string | null;
  is_corrected: boolean;
  corrected_at: string | null;
  corrected_by_user_id: string | null;
  auto_closed: boolean;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_initials?: string;
  dni?: string | null;
  closed_by_admin?: boolean;
  incident_label?: string | null;
  severity?: "ok" | "warning" | "critical";
  exit_note?: string | null;
  incident_type?: IncidentType;
  /** UI aliases — set by normalizeSession in attendance.service.ts */
  clock_in_time: string;
  clock_out_time: string | null;
  is_active: boolean;
  total_seconds: number | null;
  // Geolocation fields
  clock_in_latitude?: number | null;
  clock_in_longitude?: number | null;
  clock_in_accuracy_meters?: number | null;
  clock_in_location_status?: "in_range" | "out_of_range" | "unknown" | null;
  clock_in_distance_meters?: number | null;
  clock_out_latitude?: number | null;
  clock_out_longitude?: number | null;
  clock_out_accuracy_meters?: number | null;
  clock_out_location_status?: "in_range" | "out_of_range" | "unknown" | null;
  clock_out_distance_meters?: number | null;
  location_source?: string;
  location_permission_status?: string;
}

export interface SessionReport extends AttendanceSession {
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    full_name: string;
    initials?: string;
    has_pin?: boolean;
    role_title?: string | null;
  };
  total_hours?: number;
}

export interface AttendanceStatus {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    initials: string;
    role: string;
    role_title: string | null;
    has_pin: boolean;
  };
  is_clocked_in: boolean;
  active_session: AttendanceSession | null;
  last_session: AttendanceSession | null;
}

export interface ClockRequest {
  employee_id?: string;
  session_id?: string;
  method?: "web" | "kiosk" | "mobile" | "pin" | "admin";
  pin?: string;
  notes?: string;
  // Geolocation
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  location_source?: string;
  location_permission_status?: string;
  auto_close_open_session?: boolean;
}

export interface AttendanceHistoryFilters {
  date_from?: string;
  date_to?: string;
  employee_id?: string;
  status?: "open" | "closed" | "void";
}

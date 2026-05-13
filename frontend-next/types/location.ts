export type LocationStatus = "in_range" | "out_of_range" | "unknown";
export type LocationSource = "browser" | "mobile" | "kiosk" | "manual" | "unknown";
export type LocationPermissionStatus = "granted" | "denied" | "unavailable" | "unknown";

export interface WorkLocation {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  allowed_radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkLocationCreate {
  name: string;
  address?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  allowed_radius_meters?: number;
  is_active?: boolean;
}

export interface WorkLocationUpdate {
  name?: string;
  address?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  allowed_radius_meters?: number;
  is_active?: boolean;
}

export interface EmployeeSnippet {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface AttendanceLocationEvent {
  session_id: string;
  company_id: string;
  employee_id: string;
  employee: EmployeeSnippet | null;
  event_type: "clock_in" | "clock_out";
  occurred_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  location_status: LocationStatus | null;
  distance_meters: number | null;
  location_source: LocationSource;
  location_permission_status: LocationPermissionStatus;
  method: string;
  session_status: string;
}

export interface AttendanceLocationListResponse {
  items: AttendanceLocationEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface LatestLocationItem {
  employee_id: string;
  employee: EmployeeSnippet | null;
  session_id: string;
  occurred_at: string;
  latitude: number | null;
  longitude: number | null;
  location_status: LocationStatus | null;
  session_status: string;
}

export interface LocationSummary {
  total: number;
  in_range: number;
  out_of_range: number;
  unknown: number;
  employees_with_incidents: number;
}

export interface GeoPayload {
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  location_source?: LocationSource;
  location_permission_status?: LocationPermissionStatus;
}

import { api } from "@/lib/api-client";
import type {
  AttendanceLocationListResponse,
  LatestLocationItem,
  LocationSummary,
  WorkLocation,
  WorkLocationCreate,
  WorkLocationUpdate,
} from "@/types/location";

export interface AttendanceLocationFilters {
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  location_status?: string;
  work_location_id?: string;
  limit?: number;
  offset?: number;
}

export const locationsService = {
  list: (includeInactive = false) =>
    api
      .get<{ items: WorkLocation[] }>(`/locations${includeInactive ? "?include_inactive=true" : ""}`)
      .then((r) => r.items),

  create: (payload: WorkLocationCreate) =>
    api.post<WorkLocation>("/locations", payload),

  update: (id: string, payload: WorkLocationUpdate) =>
    api.patch<WorkLocation>(`/locations/${id}`, payload),

  delete: (id: string) => api.delete(`/locations/${id}`),

  attendanceEvents: (filters: AttendanceLocationFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.employee_id) params.set("employee_id", filters.employee_id);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.location_status) params.set("location_status", filters.location_status);
    if (filters.work_location_id) params.set("work_location_id", filters.work_location_id);
    if (filters.limit != null) params.set("limit", String(filters.limit));
    if (filters.offset != null) params.set("offset", String(filters.offset));
    const qs = params.toString();
    return api.get<AttendanceLocationListResponse>(
      `/attendance-locations${qs ? `?${qs}` : ""}`,
    );
  },

  latestLocations: () => api.get<LatestLocationItem[]>("/attendance-locations/latest"),

  summary: (filters: Pick<AttendanceLocationFilters, "date_from" | "date_to" | "employee_id"> = {}) => {
    const params = new URLSearchParams();
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.employee_id) params.set("employee_id", filters.employee_id);
    const qs = params.toString();
    return api.get<LocationSummary>(`/attendance-locations/summary${qs ? `?${qs}` : ""}`);
  },
};

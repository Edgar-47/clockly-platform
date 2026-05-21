import { api } from "@/lib/api-client";
import type { Schedule, ScheduleCreate, ScheduleListResponse, ScheduleUpdate } from "@/types/schedule";

export const schedulesService = {
  list: (includeInactive = false) =>
    api
      .get<ScheduleListResponse>(`/schedules${includeInactive ? "?include_inactive=true" : ""}`)
      .then((r) => r.items),

  get: (id: string) => api.get<Schedule>(`/schedules/${id}`),

  create: (payload: ScheduleCreate) => api.post<Schedule>("/schedules", payload),

  update: (id: string, payload: ScheduleUpdate) =>
    api.patch<Schedule>(`/schedules/${id}`, payload),
};

import { api } from "@/lib/api-client"
import type {
  LateArrival,
  LateArrivalChartsResponse,
  LateArrivalFilters,
  LateArrivalListResponse,
  LateArrivalStats,
  LateArrivalStatus,
  LateArrivalUpdateStatus,
} from "@/types/late-arrival"

const BASE = "/late-arrivals"

function buildParams(filters: LateArrivalFilters & Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

export const lateArrivalsService = {
  list: (filters: LateArrivalFilters) => {
    const qs = buildParams(filters as Record<string, unknown>)
    return api.get<LateArrivalListResponse>(`${BASE}?${qs}`)
  },

  stats: (params: { employee_id?: string; date_from?: string; date_to?: string }) => {
    const qs = buildParams(params as Record<string, unknown>)
    return api.get<LateArrivalStats>(`${BASE}/stats?${qs}`)
  },

  charts: (params: { employee_id?: string; date_from?: string; date_to?: string }) => {
    const qs = buildParams(params as Record<string, unknown>)
    return api.get<LateArrivalChartsResponse>(`${BASE}/charts?${qs}`)
  },

  get: (id: string) => api.get<LateArrival>(`${BASE}/${id}`),

  updateStatus: (id: string, payload: LateArrivalUpdateStatus) =>
    api.patch<LateArrival>(`${BASE}/${id}/status`, payload),

  export: async (filters: {
    employee_id?: string
    status?: LateArrivalStatus
    date_from?: string
    date_to?: string
  }) => {
    const qs = buildParams(filters as Record<string, unknown>)
    const { blob, filename } = await api.download(`${BASE}/export?${qs}`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const now = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    a.href = url
    a.download = filename ?? `clockly-retrasos-${now}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}

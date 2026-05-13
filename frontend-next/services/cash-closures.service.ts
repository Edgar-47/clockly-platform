import { api } from "@/lib/api-client";
import type {
  CashClosure,
  CashClosureAnalyticsFilters,
  CashClosureChartsResponse,
  CashClosureCreateRequest,
  CashClosureFilters,
  CashClosureListResponse,
  CashClosurePrefillResponse,
  CashClosureStats,
  CashClosureUpdateRequest,
} from "@/types/cash-closure";

const BASE = "/cash-closures";

function buildParams(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const cashClosuresService = {
  list: (filters: CashClosureFilters) => {
    const qs = buildParams(filters);
    return api.get<CashClosureListResponse>(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => api.get<CashClosure>(`${BASE}/${id}`),

  create: (payload: CashClosureCreateRequest) =>
    api.post<CashClosure>(BASE, payload),

  update: (id: string, payload: CashClosureUpdateRequest) =>
    api.patch<CashClosure>(`${BASE}/${id}`, payload),

  stats: (filters: CashClosureAnalyticsFilters) => {
    const qs = buildParams(filters);
    return api.get<CashClosureStats>(`${BASE}/stats${qs ? `?${qs}` : ""}`);
  },

  charts: (filters: CashClosureAnalyticsFilters) => {
    const qs = buildParams(filters);
    return api.get<CashClosureChartsResponse>(`${BASE}/charts${qs ? `?${qs}` : ""}`);
  },

  prefill: (filters: Pick<CashClosureAnalyticsFilters, "location_id" | "shift"> & { date?: string }) => {
    const qs = buildParams(filters);
    return api.get<CashClosurePrefillResponse>(`${BASE}/prefill${qs ? `?${qs}` : ""}`);
  },

  export: async (filters: CashClosureFilters & { format: "xlsx" | "csv" }) => {
    const qs = buildParams(filters);
    const { blob, filename } = await api.download(`${BASE}/export${qs ? `?${qs}` : ""}`);
    const fallback = `clockly-cierres-caja-${new Date().toISOString().slice(0, 10)}.${filters.format}`;
    saveBlob(blob, filename ?? fallback);
  },
};

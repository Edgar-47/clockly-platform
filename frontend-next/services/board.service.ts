import { api } from "@/lib/api-client";
import type {
  BoardLabel,
  BoardLabelCreateRequest,
  BoardLabelListResponse,
  BoardLabelUpdateRequest,
  BoardNote,
  BoardNoteCreateRequest,
  BoardNoteFilters,
  BoardNoteListResponse,
  BoardNoteUpdateRequest,
} from "@/types/board";

const BASE = "/board";

function buildParams(filters: BoardNoteFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export const boardService = {
  listNotes: (filters: BoardNoteFilters = {}) => {
    const qs = buildParams(filters);
    return api.get<BoardNoteListResponse>(`${BASE}/notes${qs ? `?${qs}` : ""}`);
  },

  createNote: (payload: BoardNoteCreateRequest) =>
    api.post<BoardNote>(`${BASE}/notes`, payload),

  updateNote: (id: string, payload: BoardNoteUpdateRequest) =>
    api.patch<BoardNote>(`${BASE}/notes/${id}`, payload),

  deleteNote: (id: string) => api.delete<void>(`${BASE}/notes/${id}`),

  completeNote: (id: string) => api.patch<BoardNote>(`${BASE}/notes/${id}/complete`),

  archiveNote: (id: string) => api.patch<BoardNote>(`${BASE}/notes/${id}/archive`),

  listLabels: () => api.get<BoardLabelListResponse>(`${BASE}/labels`),

  createLabel: (payload: BoardLabelCreateRequest) =>
    api.post<BoardLabel>(`${BASE}/labels`, payload),

  updateLabel: (id: string, payload: BoardLabelUpdateRequest) =>
    api.patch<BoardLabel>(`${BASE}/labels/${id}`, payload),

  deleteLabel: (id: string) => api.delete<void>(`${BASE}/labels/${id}`),
};

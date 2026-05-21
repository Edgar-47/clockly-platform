"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boardService } from "@/services/board.service";
import type {
  BoardLabelCreateRequest,
  BoardLabelUpdateRequest,
  BoardNoteCreateRequest,
  BoardNoteFilters,
  BoardNoteUpdateRequest,
} from "@/types/board";

export const boardKeys = {
  all: ["board"] as const,
  notes: () => ["board", "notes"] as const,
  noteList: (filters: BoardNoteFilters) => ["board", "notes", filters] as const,
  labels: () => ["board", "labels"] as const,
};

export function useBoardNotes(filters: BoardNoteFilters = {}) {
  return useQuery({
    queryKey: boardKeys.noteList(filters),
    queryFn: () => boardService.listNotes(filters),
  });
}

export function useCreateBoardNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BoardNoteCreateRequest) => boardService.createNote(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.notes() }),
  });
}

export function useUpdateBoardNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BoardNoteUpdateRequest }) =>
      boardService.updateNote(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.notes() }),
  });
}

export function useDeleteBoardNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardService.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.notes() }),
  });
}

export function useCompleteBoardNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardService.completeNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.notes() }),
  });
}

export function useArchiveBoardNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardService.archiveNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.notes() }),
  });
}

export function useBoardLabels() {
  return useQuery({
    queryKey: boardKeys.labels(),
    queryFn: boardService.listLabels,
  });
}

export function useCreateBoardLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BoardLabelCreateRequest) => boardService.createLabel(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.labels() }),
  });
}

export function useUpdateBoardLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BoardLabelUpdateRequest }) =>
      boardService.updateLabel(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.labels() });
      qc.invalidateQueries({ queryKey: boardKeys.notes() });
    },
  });
}

export function useDeleteBoardLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardService.deleteLabel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.labels() });
      qc.invalidateQueries({ queryKey: boardKeys.notes() });
    },
  });
}

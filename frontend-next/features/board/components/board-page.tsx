"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { BoardEmptyState } from "./board-empty-state";
import { BoardFilters, type BoardFilterState } from "./board-filters";
import { BoardHeader } from "./board-header";
import { BoardLabelManager } from "./board-label-manager";
import { BoardNoteCard } from "./board-note-card";
import { BoardNoteModal } from "./board-note-modal";
import { BoardSkeleton } from "./board-skeleton";
import {
  useArchiveBoardNote,
  useBoardLabels,
  useBoardNotes,
  useCompleteBoardNote,
  useCreateBoardNote,
  useDeleteBoardNote,
  useUpdateBoardNote,
} from "@/hooks/use-board";
import type {
  BoardNote,
  BoardNoteCreateRequest,
  BoardNoteFilters,
  BoardNoteUpdateRequest,
} from "@/types/board";

const DEFAULT_FILTERS: BoardFilterState = {
  status: "active",
  priority: "all",
  labelId: "all",
  search: "",
};

export function BoardPage() {
  const [filters, setFilters] = useState<BoardFilterState>(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<BoardNote | null>(null);
  const deferredSearch = useDeferredValue(filters.search);

  const apiFilters = useMemo<BoardNoteFilters>(() => {
    const next: BoardNoteFilters = { limit: 100, offset: 0 };
    if (filters.status === "all") {
      next.include_archived = true;
    } else if (filters.status !== "active") {
      next.status = filters.status;
      next.include_archived = filters.status === "archived";
    }
    if (filters.priority !== "all") next.priority = filters.priority;
    if (filters.labelId !== "all") next.label_id = filters.labelId;
    if (deferredSearch.trim()) next.search = deferredSearch.trim();
    return next;
  }, [deferredSearch, filters.labelId, filters.priority, filters.status]);

  const notesQuery = useBoardNotes(apiFilters);
  const labelsQuery = useBoardLabels();
  const createNote = useCreateBoardNote();
  const updateNote = useUpdateBoardNote();
  const completeNote = useCompleteBoardNote();
  const archiveNote = useArchiveBoardNote();
  const deleteNote = useDeleteBoardNote();

  const notes = notesQuery.data?.items ?? [];
  const labels = labelsQuery.data?.items ?? [];
  const hasFilters =
    filters.status !== "active" ||
    filters.priority !== "all" ||
    filters.labelId !== "all" ||
    filters.search.trim() !== "";

  const updatingId =
    (updateNote.isPending ? updateNote.variables?.id : null) ??
    (completeNote.isPending ? completeNote.variables : null) ??
    (archiveNote.isPending ? archiveNote.variables : null) ??
    (deleteNote.isPending ? deleteNote.variables : null);

  function openCreate() {
    setActiveNote(null);
    setModalOpen(true);
  }

  function openEdit(note: BoardNote) {
    setActiveNote(note);
    setModalOpen(true);
  }

  function submitNote(payload: BoardNoteCreateRequest | BoardNoteUpdateRequest) {
    if (activeNote) {
      updateNote.mutate(
        { id: activeNote.id, payload },
        {
          onSuccess: () => {
            toast.success("Nota actualizada.");
            setModalOpen(false);
            setActiveNote(null);
          },
          onError: (err) => toast.error((err as Error).message ?? "No se pudo actualizar la nota."),
        },
      );
      return;
    }

    createNote.mutate(payload as BoardNoteCreateRequest, {
      onSuccess: () => {
        toast.success("Nota creada.");
        setModalOpen(false);
      },
      onError: (err) => toast.error((err as Error).message ?? "No se pudo crear la nota."),
    });
  }

  function complete(note: BoardNote) {
    completeNote.mutate(note.id, {
      onSuccess: () => toast.success("Nota completada."),
      onError: (err) => toast.error((err as Error).message ?? "No se pudo completar la nota."),
    });
  }

  function archive(note: BoardNote) {
    archiveNote.mutate(note.id, {
      onSuccess: () => toast.success("Nota archivada."),
      onError: (err) => toast.error((err as Error).message ?? "No se pudo archivar la nota."),
    });
  }

  function remove(note: BoardNote) {
    if (!window.confirm(`Eliminar la nota "${note.title}"?`)) return;
    deleteNote.mutate(note.id, {
      onSuccess: () => toast.success("Nota eliminada."),
      onError: (err) => toast.error((err as Error).message ?? "No se pudo eliminar la nota."),
    });
  }

  return (
    <>
      <Topbar title="Tablero" />
      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <BoardHeader notes={notes} onNewNote={openCreate} onManageLabels={() => setLabelManagerOpen(true)} />

        <BoardFilters filters={filters} labels={labels} onChange={setFilters} />

        {notesQuery.isError && (
          <div className="flex items-start gap-3 rounded-2xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-DEFAULT">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">No se pudo cargar el tablero.</p>
              <p className="mt-1 text-[13px]">{(notesQuery.error as Error).message}</p>
            </div>
          </div>
        )}

        {notesQuery.isLoading ? (
          <BoardSkeleton />
        ) : notes.length === 0 ? (
          <BoardEmptyState hasFilters={hasFilters} onNewNote={openCreate} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {notes.map((note) => (
              <BoardNoteCard
                key={note.id}
                note={note}
                updating={updatingId === note.id}
                onEdit={openEdit}
                onComplete={complete}
                onArchive={archive}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </div>

      <BoardNoteModal
        open={modalOpen}
        note={activeNote}
        labels={labels}
        loading={createNote.isPending || updateNote.isPending}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setActiveNote(null);
        }}
        onSubmit={submitNote}
      />

      <BoardLabelManager
        open={labelManagerOpen}
        labels={labels}
        onOpenChange={setLabelManagerOpen}
      />
    </>
  );
}

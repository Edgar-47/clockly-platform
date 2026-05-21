"use client";

import { Archive, Bell, Check, Clock3, Pencil, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityBadge, StatusBadge } from "./board-badges";
import type { BoardNote } from "@/types/board";

export function BoardNoteCard({
  note,
  updating,
  onEdit,
  onComplete,
  onArchive,
  onDelete,
}: {
  note: BoardNote;
  updating?: boolean;
  onEdit: (note: BoardNote) => void;
  onComplete: (note: BoardNote) => void;
  onArchive: (note: BoardNote) => void;
  onDelete: (note: BoardNote) => void;
}) {
  const done = note.status === "completed";
  const archived = note.status === "archived";

  return (
    <article
      className={cn(
        "group relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-xs transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md",
        archived && "bg-surface-muted/80 opacity-80",
      )}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={note.status} />
            <PriorityBadge priority={note.priority} />
          </div>
          <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight text-ink">
            {note.title}
          </h3>
        </div>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Editar nota"
          onClick={() => onEdit(note)}
          className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="mt-3 line-clamp-4 min-h-[72px] text-[13px] leading-6 text-ink-muted">
        {note.content || "Sin descripcion. Usa esta nota como recordatorio rapido del equipo."}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {note.labels.length > 0 ? (
          note.labels.map((label) => <LabelChip key={label.id} label={label} />)
        ) : (
          <span className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-[11px] font-medium text-ink-xmuted">
            Sin etiquetas
          </span>
        )}
      </div>

      <div className="mt-auto space-y-3 pt-5">
        <div className="grid gap-2 text-[12px] text-ink-muted">
          <span className="inline-flex min-w-0 items-center gap-2">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-ink-xmuted" />
            <span className="truncate">{note.author?.full_name ?? "Equipo ClockLy"}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-ink-xmuted" />
            {formatDate(note.updated_at || note.created_at)}
          </span>
          {note.reminder_at && (
            <span className="inline-flex items-center gap-2 text-primary">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              {formatDateTime(note.reminder_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-t border-border pt-3">
          {!done && !archived && (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label="Completar nota"
              loading={updating}
              onClick={() => onComplete(note)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {!archived && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Archivar nota"
              loading={updating}
              onClick={() => onArchive(note)}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Eliminar nota"
            loading={updating}
            onClick={() => onDelete(note)}
            className="ml-auto text-danger-DEFAULT hover:bg-danger-bg hover:text-danger-DEFAULT"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

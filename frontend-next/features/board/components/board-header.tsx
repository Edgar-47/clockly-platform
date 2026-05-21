"use client";

import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BoardNote } from "@/types/board";

export function BoardHeader({
  notes,
  onNewNote,
  onManageLabels,
}: {
  notes: BoardNote[];
  onNewNote: () => void;
  onManageLabels: () => void;
}) {
  const openCount = notes.filter((note) => note.status !== "completed" && note.status !== "archived").length;
  const urgentCount = notes.filter((note) => note.priority === "urgent" && note.status !== "archived").length;
  const reminderCount = notes.filter((note) => Boolean(note.reminder_at) && note.status !== "archived").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
              Tablero
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted sm:text-[15px]">
              Organiza recordatorios, tareas pendientes y notas internas de tu equipo.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={onManageLabels}>
              <Tags className="h-4 w-4" />
              Etiquetas
            </Button>
            <Button type="button" onClick={onNewNote}>
              <Plus className="h-4 w-4" />
              Nueva nota
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <BoardMetric label="Activas" value={openCount} />
          <BoardMetric label="Urgentes" value={urgentCount} tone="danger" />
          <BoardMetric label="Con recordatorio" value={reminderCount} tone="primary" />
        </div>
      </div>
    </section>
  );
}

function BoardMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "primary" | "danger";
}) {
  const dotClass =
    tone === "primary" ? "bg-primary" : tone === "danger" ? "bg-danger-DEFAULT" : "bg-ink-xmuted";

  return (
    <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className="text-[12px] font-medium text-ink-muted">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
    </div>
  );
}

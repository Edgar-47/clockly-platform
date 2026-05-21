"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOARD_PRIORITY_LABELS, BOARD_STATUS_LABELS, LabelChip } from "./board-badges";
import type { BoardLabel, BoardNotePriority, BoardNoteStatus } from "@/types/board";

export type BoardStatusFilter = "active" | "all" | BoardNoteStatus;

export interface BoardFilterState {
  status: BoardStatusFilter;
  priority: "all" | BoardNotePriority;
  labelId: "all" | string;
  search: string;
}

export function BoardFilters({
  filters,
  labels,
  onChange,
}: {
  filters: BoardFilterState;
  labels: BoardLabel[];
  onChange: (filters: BoardFilterState) => void;
}) {
  const hasFilters =
    filters.status !== "active" ||
    filters.priority !== "all" ||
    filters.labelId !== "all" ||
    filters.search.trim() !== "";

  function update(partial: Partial<BoardFilterState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <section className="rounded-2xl border border-border bg-white/90 p-3 shadow-xs backdrop-blur-sm">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1.1fr)_180px_170px_minmax(190px,0.8fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-xmuted" />
          <Input
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            className="h-10 rounded-lg border-border bg-white pl-9 shadow-none"
            placeholder="Buscar por titulo o contenido"
          />
        </label>

        <Select
          value={filters.status}
          onValueChange={(value) => update({ status: value as BoardStatusFilter })}
        >
          <SelectTrigger className="h-10 rounded-lg border-border shadow-none">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">{BOARD_STATUS_LABELS.pending}</SelectItem>
            <SelectItem value="in_progress">{BOARD_STATUS_LABELS.in_progress}</SelectItem>
            <SelectItem value="completed">{BOARD_STATUS_LABELS.completed}</SelectItem>
            <SelectItem value="archived">{BOARD_STATUS_LABELS.archived}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) => update({ priority: value as "all" | BoardNotePriority })}
        >
          <SelectTrigger className="h-10 rounded-lg border-border shadow-none">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">{BOARD_PRIORITY_LABELS.low}</SelectItem>
            <SelectItem value="medium">{BOARD_PRIORITY_LABELS.medium}</SelectItem>
            <SelectItem value="high">{BOARD_PRIORITY_LABELS.high}</SelectItem>
            <SelectItem value="urgent">{BOARD_PRIORITY_LABELS.urgent}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.labelId}
          onValueChange={(value) => update({ labelId: value })}
        >
          <SelectTrigger className="h-10 rounded-lg border-border shadow-none">
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etiquetas</SelectItem>
            {labels.map((label) => (
              <SelectItem key={label.id} value={label.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                  {label.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          disabled={!hasFilters}
          onClick={() =>
            onChange({
              status: "active",
              priority: "all",
              labelId: "all",
              search: "",
            })
          }
          className="h-10 justify-center rounded-lg"
        >
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      </div>

      {filters.labelId !== "all" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
          <span className="text-[12px] text-ink-muted">Etiqueta activa:</span>
          {labels
            .filter((label) => label.id === filters.labelId)
            .map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
        </div>
      )}
    </section>
  );
}

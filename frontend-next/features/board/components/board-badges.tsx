"use client";

import { AlertCircle, CheckCircle2, Circle, Flame, Loader2, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardLabel, BoardLabelColor, BoardNotePriority, BoardNoteStatus } from "@/types/board";

export const LABEL_COLOR_STYLES: Record<BoardLabelColor, string> = {
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
  pink: "border-pink-200 bg-pink-50 text-pink-700",
  gray: "border-slate-200 bg-slate-50 text-slate-600",
  yellow: "border-amber-200 bg-amber-50 text-amber-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

export const LABEL_DOT_STYLES: Record<BoardLabelColor, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  red: "bg-rose-500",
  purple: "bg-violet-500",
  pink: "bg-pink-500",
  gray: "bg-slate-400",
  yellow: "bg-amber-400",
  cyan: "bg-cyan-500",
};

const STATUS_LABELS: Record<BoardNoteStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  archived: "Archivada",
};

const STATUS_STYLES: Record<BoardNoteStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  archived: "border-slate-200 bg-slate-50 text-slate-600",
};

const STATUS_ICONS: Record<BoardNoteStatus, React.ElementType> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  archived: PauseCircle,
};

const PRIORITY_LABELS: Record<BoardNotePriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_STYLES: Record<BoardNotePriority, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
};

export function LabelChip({ label, className }: { label: BoardLabel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        LABEL_COLOR_STYLES[label.color],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", LABEL_DOT_STYLES[label.color])} />
      <span className="truncate">{label.name}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: BoardNoteStatus }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        STATUS_STYLES[status],
      )}
    >
      <Icon className={cn("h-3 w-3", status === "in_progress" && "animate-spin")} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: BoardNotePriority }) {
  const urgent = priority === "urgent";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        PRIORITY_STYLES[priority],
      )}
    >
      {urgent ? <Flame className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export const BOARD_STATUS_LABELS = STATUS_LABELS;
export const BOARD_PRIORITY_LABELS = PRIORITY_LABELS;

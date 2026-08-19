"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Check, Tags } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BOARD_PRIORITY_LABELS,
  BOARD_STATUS_LABELS,
  LABEL_COLOR_STYLES,
  LABEL_DOT_STYLES,
} from "./board-badges";
import type {
  BoardLabel,
  BoardNote,
  BoardNoteCreateRequest,
  BoardNotePriority,
  BoardNoteStatus,
  BoardNoteUpdateRequest,
} from "@/types/board";

const formSchema = z.object({
  title: z.string().min(1, "Título requerido").max(180, "Máximo 180 caracteres"),
  content: z.string().max(5000, "Máximo 5000 caracteres").optional(),
  status: z.enum(["pending", "in_progress", "completed", "archived"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  label_ids: z.array(z.string()).max(12),
  reminder_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function BoardNoteModal({
  open,
  note,
  labels,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  note: BoardNote | null;
  labels: BoardLabel[];
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: BoardNoteCreateRequest | BoardNoteUpdateRequest) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(),
  });

  const selectedLabels = watch("label_ids") ?? [];
  const status = watch("status");
  const priority = watch("priority");

  useEffect(() => {
    if (!open) return;
    reset(note ? valuesFromNote(note) : emptyValues());
  }, [note, open, reset]);

  function toggleLabel(labelId: string) {
    const next = selectedLabels.includes(labelId)
      ? selectedLabels.filter((id) => id !== labelId)
      : [...selectedLabels, labelId];
    setValue("label_ids", next, { shouldDirty: true, shouldValidate: true });
  }

  function submit(values: FormValues) {
    onSubmit({
      title: values.title.trim(),
      content: values.content?.trim() || null,
      status: values.status,
      priority: values.priority,
      label_ids: values.label_ids,
      reminder_at: values.reminder_at ? new Date(values.reminder_at).toISOString() : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 flex h-[100dvh] max-w-[560px] translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-y-0 border-r-0 p-0 shadow-lg sm:rounded-l-2xl">
        <DialogHeader className="border-b border-border bg-white/95 px-5 py-5 backdrop-blur-sm sm:px-6">
          <DialogTitle>{note ? "Editar nota" : "Nueva nota"}</DialogTitle>
          <DialogDescription>
            Captura recordatorios, tareas y avisos internos con el contexto justo.
          </DialogDescription>
        </DialogHeader>

        <form id="board-note-form" className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6" onSubmit={handleSubmit(submit)}>
          <div className="space-y-1.5">
            <Label htmlFor="board-note-title" className="text-[13px]">
              Título
            </Label>
            <Input
              id="board-note-title"
              placeholder="Revisar turnos del viernes"
              className="h-11 rounded-lg"
              {...register("title")}
            />
            {errors.title && <p className="text-[12px] text-danger-DEFAULT">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="board-note-content" className="text-[13px]">
              Descripción
            </Label>
            <textarea
              id="board-note-content"
              className="min-h-[150px] w-full resize-none rounded-lg border border-border-strong bg-white px-3 py-2 text-sm leading-6 text-ink shadow-inner-sm outline-none transition-all duration-150 placeholder:text-ink-xmuted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:shadow-none"
              placeholder="Añade el contexto necesario para que cualquiera del equipo lo entienda rápido."
              {...register("content")}
            />
            {errors.content && <p className="text-[12px] text-danger-DEFAULT">{errors.content.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Estado</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue("status", value as BoardNoteStatus, { shouldDirty: true, shouldValidate: true })
                }
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{BOARD_STATUS_LABELS.pending}</SelectItem>
                  <SelectItem value="in_progress">{BOARD_STATUS_LABELS.in_progress}</SelectItem>
                  <SelectItem value="completed">{BOARD_STATUS_LABELS.completed}</SelectItem>
                  <SelectItem value="archived">{BOARD_STATUS_LABELS.archived}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Prioridad</Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setValue("priority", value as BoardNotePriority, { shouldDirty: true, shouldValidate: true })
                }
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{BOARD_PRIORITY_LABELS.low}</SelectItem>
                  <SelectItem value="medium">{BOARD_PRIORITY_LABELS.medium}</SelectItem>
                  <SelectItem value="high">{BOARD_PRIORITY_LABELS.high}</SelectItem>
                  <SelectItem value="urgent">{BOARD_PRIORITY_LABELS.urgent}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="board-note-reminder" className="inline-flex items-center gap-2 text-[13px]">
              <Bell className="h-3.5 w-3.5 text-primary" />
              Recordatorio opcional
            </Label>
            <Input id="board-note-reminder" type="datetime-local" className="h-10 rounded-lg" {...register("reminder_at")} />
          </div>

          <div className="space-y-2">
            <Label className="inline-flex items-center gap-2 text-[13px]">
              <Tags className="h-3.5 w-3.5 text-primary" />
              Etiquetas
            </Label>
            <div className="flex flex-wrap gap-2">
              {labels.length === 0 && (
                <span className="text-[13px] text-ink-muted">Crea etiquetas para clasificar notas.</span>
              )}
              {labels.map((label) => {
                const selected = selectedLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                      selected
                        ? LABEL_COLOR_STYLES[label.color]
                        : "border-border-strong bg-white text-ink-muted hover:bg-surface-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        selected ? LABEL_DOT_STYLES[label.color] : "bg-ink-xmuted",
                      )}
                    />
                    <span className="truncate">{label.name}</span>
                    {selected && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        <DialogFooter className="border-t border-border bg-white px-5 py-4 sm:px-6">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="board-note-form" loading={loading}>
            {note ? "Guardar cambios" : "Crear nota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyValues(): FormValues {
  return {
    title: "",
    content: "",
    status: "pending",
    priority: "medium",
    label_ids: [],
    reminder_at: "",
  };
}

function valuesFromNote(note: BoardNote): FormValues {
  return {
    title: note.title,
    content: note.content ?? "",
    status: note.status,
    priority: note.priority,
    label_ids: note.labels.map((label) => label.id),
    reminder_at: note.reminder_at ? toLocalDateTimeInput(note.reminder_at) : "",
  };
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

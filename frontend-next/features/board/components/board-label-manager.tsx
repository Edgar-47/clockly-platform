"use client";

import { useCallback, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import {
  LABEL_COLOR_STYLES,
  LABEL_DOT_STYLES,
  LabelChip,
} from "./board-badges";
import {
  useCreateBoardLabel,
  useDeleteBoardLabel,
  useUpdateBoardLabel,
} from "@/hooks/use-board";
import type { BoardLabel, BoardLabelColor } from "@/types/board";
import { BOARD_LABEL_COLORS } from "@/types/board";

const labelSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(80, "Maximo 80 caracteres"),
  color: z.enum(["blue", "green", "orange", "red", "purple", "pink", "gray", "yellow", "cyan"]),
  description: z.string().trim().max(500, "Maximo 500 caracteres").optional(),
});

const COLOR_LABELS: Record<BoardLabelColor, string> = {
  blue: "Azul",
  green: "Verde",
  orange: "Naranja",
  red: "Rojo",
  purple: "Morado",
  pink: "Rosa",
  gray: "Gris",
  yellow: "Amarillo",
  cyan: "Cyan",
};

export function BoardLabelManager({
  open,
  labels,
  onOpenChange,
}: {
  open: boolean;
  labels: BoardLabel[];
  onOpenChange: (open: boolean) => void;
}) {
  const [editing, setEditing] = useState<BoardLabel | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<BoardLabelColor>("blue");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateBoardLabel();
  const update = useUpdateBoardLabel();
  const remove = useDeleteBoardLabel();

  const loading = create.isPending || update.isPending;

  const resetForm = useCallback(() => {
    setEditing(null);
    setName("");
    setDescription("");
    setColor("blue");
    setError(null);
  }, []);

  function editLabel(label: BoardLabel) {
    setEditing(label);
    setName(label.name);
    setDescription(label.description ?? "");
    setColor(label.color);
    setError(null);
  }

  function submit() {
    const parsed = labelSchema.safeParse({ name, color, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Etiqueta no valida.");
      return;
    }
    const payload = {
      name: parsed.data.name,
      color: parsed.data.color,
      description: parsed.data.description || null,
    };

    if (editing) {
      update.mutate(
        { id: editing.id, payload },
        {
          onSuccess: () => {
            toast.success("Etiqueta actualizada.");
            resetForm();
          },
          onError: (err) => setError((err as Error).message ?? "No se pudo actualizar la etiqueta."),
        },
      );
      return;
    }

    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Etiqueta creada.");
        resetForm();
      },
      onError: (err) => setError((err as Error).message ?? "No se pudo crear la etiqueta."),
    });
  }

  function deleteLabel(label: BoardLabel) {
    if (!window.confirm(`Eliminar la etiqueta "${label.name}"?`)) return;
    remove.mutate(label.id, {
      onSuccess: () => toast.success("Etiqueta eliminada."),
      onError: (err) =>
        toast.error((err as Error).message ?? "No se pudo eliminar la etiqueta."),
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[760px] overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-white px-6 py-5">
          <DialogTitle>Gestionar etiquetas</DialogTitle>
          <DialogDescription>
            Crea una taxonomia ligera para ordenar recordatorios, tareas e incidencias.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[72vh] overflow-y-auto md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-2 border-b border-border p-5 md:border-b-0 md:border-r">
            {labels.length === 0 && (
              <div className="rounded-xl border border-dashed border-border-strong p-5 text-sm text-ink-muted">
                Todavia no hay etiquetas. Crea la primera para clasificar tus notas.
              </div>
            )}
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <LabelChip label={label} />
                  {label.description && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-ink-muted">
                      {label.description}
                    </p>
                  )}
                </div>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Editar etiqueta" onClick={() => editLabel(label)}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Eliminar etiqueta"
                  loading={remove.isPending && remove.variables === label.id}
                  onClick={() => deleteLabel(label)}
                  className="text-danger-DEFAULT hover:bg-danger-bg hover:text-danger-DEFAULT"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4 bg-surface-muted/60 p-5">
            <div>
              <p className="text-[13px] font-semibold text-ink">
                {editing ? "Editar etiqueta" : "Nueva etiqueta"}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                Usa nombres cortos y colores consistentes para lectura rapida.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="board-label-name" className="text-[13px]">
                Nombre
              </Label>
              <Input
                id="board-label-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Operacion diaria"
                className="h-10 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="board-label-description" className="text-[13px]">
                Descripcion
              </Label>
              <textarea
                id="board-label-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Uso interno de la etiqueta"
                className="min-h-[86px] w-full resize-none rounded-lg border border-border-strong bg-white px-3 py-2 text-sm leading-6 text-ink shadow-inner-sm outline-none transition-all duration-150 placeholder:text-ink-xmuted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:shadow-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]">Color</Label>
              <div className="grid grid-cols-3 gap-2">
                {BOARD_LABEL_COLORS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={color === item}
                    onClick={() => setColor(item)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition-all duration-150",
                      color === item ? LABEL_COLOR_STYLES[item] : "border-border-strong bg-white text-ink-muted hover:bg-white",
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", LABEL_DOT_STYLES[item])} />
                    {COLOR_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-[12px] text-danger-DEFAULT">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              {editing && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button type="button" loading={loading} onClick={submit} className="flex-1">
                <Plus className="h-4 w-4" />
                {editing ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-white px-6 py-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

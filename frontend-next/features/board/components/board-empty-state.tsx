"use client";

import { Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BoardEmptyState({
  hasFilters,
  onNewNote,
}: {
  hasFilters: boolean;
  onNewNote: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-white px-6 py-12 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <StickyNote className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-ink">
        {hasFilters ? "No hay notas con estos filtros" : "Tu tablero esta listo"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
        {hasFilters
          ? "Ajusta la busqueda, cambia la etiqueta o limpia los filtros para ver mas notas."
          : "Crea la primera nota operativa para que el equipo tenga recordatorios y pendientes en un unico sitio."}
      </p>
      {!hasFilters && (
        <Button type="button" className="mt-5" onClick={onNewNote}>
          <Plus className="h-4 w-4" />
          Nueva nota
        </Button>
      )}
    </div>
  );
}

import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { Tutorial } from "@/lib/tutorials";
import { TutorialCard } from "./tutorial-card";

interface TutorialGridProps {
  tutorials: Tutorial[];
  onResetFilters: () => void;
}

export function TutorialGrid({ tutorials, onResetFilters }: TutorialGridProps) {
  if (tutorials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-white">
        <EmptyState
          icon={<SearchX className="h-5 w-5" />}
          title="No hemos encontrado tutoriales con esos filtros."
          description="Prueba con otra búsqueda o selecciona otra categoría."
          action={{
            label: "Limpiar filtros",
            onClick: onResetFilters,
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tutorials.map((tutorial) => (
        <TutorialCard key={tutorial.slug} tutorial={tutorial} />
      ))}
    </div>
  );
}

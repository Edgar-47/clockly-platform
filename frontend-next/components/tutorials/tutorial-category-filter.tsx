"use client";

import { cn } from "@/lib/utils";
import type { TutorialCategory } from "@/lib/tutorials";

export const ALL_TUTORIAL_CATEGORIES = "Todos" as const;
export type TutorialCategorySelection = TutorialCategory | typeof ALL_TUTORIAL_CATEGORIES;

interface TutorialCategoryFilterProps {
  categories: readonly TutorialCategory[];
  activeCategory: TutorialCategorySelection;
  onChange: (category: TutorialCategorySelection) => void;
}

export function TutorialCategoryFilter({
  categories,
  activeCategory,
  onChange,
}: TutorialCategoryFilterProps) {
  const options: TutorialCategorySelection[] = [ALL_TUTORIAL_CATEGORIES, ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar tutoriales por categoría">
      {options.map((category) => {
        const active = category === activeCategory;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all duration-150",
              active
                ? "border-primary bg-primary text-white shadow-glow-sm"
                : "border-border-strong bg-white text-ink-muted shadow-xs hover:border-primary/30 hover:text-ink",
            )}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

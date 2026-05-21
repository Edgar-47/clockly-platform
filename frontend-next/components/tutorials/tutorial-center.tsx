"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { BookOpenCheck, Clock3, LayoutGrid } from "lucide-react";
import type { Tutorial, TutorialCategory } from "@/lib/tutorials";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials";
import {
  ALL_TUTORIAL_CATEGORIES,
  TutorialCategoryFilter,
  type TutorialCategorySelection,
} from "./tutorial-category-filter";
import { TutorialGrid } from "./tutorial-grid";
import { TutorialSearch } from "./tutorial-search";

interface TutorialCenterProps {
  tutorials: Tutorial[];
  categories?: readonly TutorialCategory[];
}

function searchableText(tutorial: Tutorial) {
  return [
    tutorial.title,
    tutorial.description,
    tutorial.category,
    tutorial.level,
    tutorial.steps.join(" "),
    tutorial.sections
      .flatMap((section) => [section.title, ...section.paragraphs, ...(section.steps ?? [])])
      .join(" "),
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeQuery(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function TutorialCenter({
  tutorials,
  categories = TUTORIAL_CATEGORIES,
}: TutorialCenterProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<TutorialCategorySelection>(ALL_TUTORIAL_CATEGORIES);
  const deferredQuery = useDeferredValue(query);

  const filteredTutorials = useMemo(() => {
    const normalizedQuery = normalizeQuery(deferredQuery);

    return tutorials.filter((tutorial) => {
      const categoryMatches =
        activeCategory === ALL_TUTORIAL_CATEGORIES || tutorial.category === activeCategory;
      const queryMatches =
        normalizedQuery.length === 0 || searchableText(tutorial).includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [activeCategory, deferredQuery, tutorials]);

  const totalReadTime = useMemo(
    () =>
      tutorials.reduce((total, tutorial) => {
        const minutes = Number.parseInt(tutorial.estimatedReadTime, 10);
        return Number.isNaN(minutes) ? total : total + minutes;
      }, 0),
    [tutorials],
  );

  function resetFilters() {
    setQuery("");
    setActiveCategory(ALL_TUTORIAL_CATEGORIES);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div className="max-w-3xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary shadow-inner-sm">
              <BookOpenCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[34px]">
              Centro de ayuda de ClockLy
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink-muted sm:text-base">
              Aprende a configurar y utilizar todas las funcionalidades de tu negocio paso a paso.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-xmuted">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                Tutoriales
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">{tutorials.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-xmuted">
                <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Categorías
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">{categories.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-xmuted">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Lectura
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">{totalReadTime} min</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,380px)_1fr] lg:items-center">
          <TutorialSearch value={query} onChange={setQuery} />
          <TutorialCategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-[13px] text-ink-muted">
            {filteredTutorials.length} de {tutorials.length} tutoriales visibles
          </p>
          {(query || activeCategory !== ALL_TUTORIAL_CATEGORIES) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[13px] font-semibold text-primary transition-colors hover:text-primary-dark"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      <TutorialGrid tutorials={filteredTutorials} onResetFilters={resetFilters} />
    </div>
  );
}

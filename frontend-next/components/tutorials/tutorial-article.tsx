import Link from "next/link";
import { ArrowLeft, BookOpen, Clock3, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tutorial } from "@/lib/tutorials";
import { TutorialCallout } from "./tutorial-callout";
import { TutorialCard } from "./tutorial-card";
import { TutorialIcon } from "./tutorial-icon";
import { TutorialScreenshot } from "./tutorial-screenshot";
import { TutorialStep } from "./tutorial-step";
import { TutorialTableOfContents } from "./tutorial-table-of-contents";

const levelStyles: Record<Tutorial["level"], string> = {
  Básico: "border-success-border bg-success-bg text-success-DEFAULT",
  Intermedio: "border-primary/15 bg-primary/10 text-primary",
  Avanzado: "border-warning-border bg-warning-bg text-warning-DEFAULT",
};

interface TutorialArticleProps {
  tutorial: Tutorial;
  relatedTutorials: Tutorial[];
}

export function TutorialArticle({ tutorial, relatedTutorials }: TutorialArticleProps) {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <div className="mb-5">
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link href="/tutorials">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al centro de ayuda
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <header className="border-b border-border px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary shadow-inner-sm">
                  <TutorialIcon icon={tutorial.icon} className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{tutorial.category}</Badge>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none",
                        levelStyles[tutorial.level],
                      )}
                    >
                      {tutorial.level}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      {tutorial.estimatedReadTime}
                    </span>
                  </div>
                  <h1 className="mt-4 max-w-3xl text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">
                    {tutorial.title}
                  </h1>
                  <p className="mt-4 max-w-3xl text-[15px] leading-7 text-ink-muted sm:text-base">
                    {tutorial.description}
                  </p>
                </div>
              </div>
            </header>

            <div className="space-y-10 px-5 py-7 sm:px-8 sm:py-9">
              <section aria-labelledby="resumen-rapido" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 id="resumen-rapido" className="text-[18px] font-semibold text-ink">
                      Resumen rápido
                    </h2>
                  </div>
                  <ol className="mt-5 space-y-3">
                    {tutorial.steps.map((step, index) => (
                      <TutorialStep key={step} step={step} index={index} />
                    ))}
                  </ol>
                </div>

                {tutorial.screenshots[0] && (
                  <div className="lg:pt-9">
                    <TutorialScreenshot screenshot={tutorial.screenshots[0]} />
                  </div>
                )}
              </section>

              <div className="xl:hidden">
                <TutorialTableOfContents sections={tutorial.sections} />
              </div>

              <div className="space-y-12">
                {tutorial.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="text-[22px] font-semibold leading-tight text-ink">
                      {section.title}
                    </h2>
                    <div className="mt-4 space-y-4">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-[15px] leading-7 text-ink-muted">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {section.steps && section.steps.length > 0 && (
                      <ol className="mt-6 space-y-3 rounded-2xl border border-border bg-surface-muted p-4 sm:p-5">
                        {section.steps.map((step, index) => (
                          <TutorialStep key={step} step={step} index={index} />
                        ))}
                      </ol>
                    )}

                    {section.callouts && section.callouts.length > 0 && (
                      <div className="mt-6 grid gap-3">
                        {section.callouts.map((callout) => (
                          <TutorialCallout key={`${section.id}-${callout.title}`} callout={callout} />
                        ))}
                      </div>
                    )}

                    {section.screenshots && section.screenshots.length > 0 && (
                      <div className="mt-6 grid gap-4">
                        {section.screenshots.map((screenshot) => (
                          <TutorialScreenshot key={screenshot.label} screenshot={screenshot} />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {tutorial.screenshots.length > 1 && (
                <section aria-labelledby="capturas" className="border-t border-border pt-8">
                  <div className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 id="capturas" className="text-[18px] font-semibold text-ink">
                      Capturas de referencia
                    </h2>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {tutorial.screenshots.slice(1).map((screenshot) => (
                      <TutorialScreenshot key={screenshot.label} screenshot={screenshot} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {relatedTutorials.length > 0 && (
            <section className="mt-6" aria-labelledby="tutoriales-relacionados">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="tutoriales-relacionados" className="text-[18px] font-semibold text-ink">
                  Tutoriales relacionados
                </h2>
                <Button asChild variant="link" size="sm">
                  <Link href="/tutorials">Ver todos</Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {relatedTutorials.map((related) => (
                  <TutorialCard key={related.slug} tutorial={related} />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-[86px]">
            <TutorialTableOfContents sections={tutorial.sections} />
          </div>
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tutorial } from "@/lib/tutorials";
import { TutorialIcon } from "./tutorial-icon";

const levelStyles: Record<Tutorial["level"], string> = {
  Básico: "border-success-border bg-success-bg text-success-DEFAULT",
  Intermedio: "border-primary/15 bg-primary/10 text-primary",
  Avanzado: "border-warning-border bg-warning-bg text-warning-DEFAULT",
};

interface TutorialCardProps {
  tutorial: Tutorial;
}

export function TutorialCard({ tutorial }: TutorialCardProps) {
  return (
    <Link href={`/tutorials/${tutorial.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden rounded-2xl border-border-strong bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
        <CardContent className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary shadow-inner-sm transition-all duration-200 group-hover:bg-primary group-hover:text-white">
              <TutorialIcon icon={tutorial.icon} />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {tutorial.estimatedReadTime}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="muted">{tutorial.category}</Badge>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none",
                levelStyles[tutorial.level],
              )}
            >
              {tutorial.level}
            </span>
          </div>

          <div className="mt-4 flex-1">
            <h2 className="text-[18px] font-semibold leading-snug tracking-tight text-ink">
              {tutorial.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
              {tutorial.description}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-[13px] font-semibold text-primary">
            <span>Ver tutorial</span>
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

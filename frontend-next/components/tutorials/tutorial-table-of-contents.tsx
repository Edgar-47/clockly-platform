import { ListTree } from "lucide-react";
import type { TutorialSection } from "@/lib/tutorials";

interface TutorialTableOfContentsProps {
  sections: TutorialSection[];
}

export function TutorialTableOfContents({ sections }: TutorialTableOfContentsProps) {
  return (
    <nav
      aria-label="Índice del tutorial"
      className="rounded-2xl border border-border bg-white p-4 shadow-xs"
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <ListTree className="h-4 w-4 text-primary" aria-hidden="true" />
        Índice
      </div>
      <ol className="mt-4 space-y-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="block rounded-lg px-2.5 py-2 text-[13px] leading-5 text-ink-muted transition-colors hover:bg-surface-bg hover:text-ink"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

import {
  CheckCircle2,
  Info,
  Lightbulb,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TutorialCallout as TutorialCalloutData, TutorialCalloutType } from "@/lib/tutorials";

const calloutStyles: Record<
  TutorialCalloutType,
  { icon: LucideIcon; className: string; iconClassName: string }
> = {
  before: {
    icon: Info,
    className: "border-primary/15 bg-primary/10 text-primary",
    iconClassName: "text-primary",
  },
  tip: {
    icon: Lightbulb,
    className: "border-success-border bg-success-bg text-success-DEFAULT",
    iconClassName: "text-success-DEFAULT",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-warning-border bg-warning-bg text-warning-DEFAULT",
    iconClassName: "text-warning-DEFAULT",
  },
  success: {
    icon: CheckCircle2,
    className: "border-success-border bg-success-bg text-success-DEFAULT",
    iconClassName: "text-success-DEFAULT",
  },
};

interface TutorialCalloutProps {
  callout: TutorialCalloutData;
}

export function TutorialCallout({ callout }: TutorialCalloutProps) {
  const styles = calloutStyles[callout.type];
  const Icon = styles.icon;

  return (
    <aside className={cn("rounded-2xl border p-4 sm:p-5", styles.className)}>
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-xs">
          <Icon className={cn("h-4 w-4", styles.iconClassName)} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-ink">{callout.title}</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{callout.body}</p>
        </div>
      </div>
    </aside>
  );
}

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 px-6 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-bg text-ink-xmuted border border-border">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-ink-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Button className="mt-5" onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

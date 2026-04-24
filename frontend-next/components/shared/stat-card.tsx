import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: "blue" | "green" | "orange" | "red" | "gray";
  trend?: string;
  loading?: boolean;
}

const iconColorMap = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success-bg text-success-DEFAULT",
  orange: "bg-warning-bg text-warning-DEFAULT",
  red: "bg-danger-bg text-danger-DEFAULT",
  gray: "bg-surface-bg text-ink-muted",
};

export function StatCard({
  label,
  value,
  icon,
  iconColor = "blue",
  trend,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-white border border-border shadow-xs p-5">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-3.5 w-28 mt-4" />
        <Skeleton className="h-7 w-16 mt-2" />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-border shadow-xs p-5 transition-shadow duration-200 hover:shadow-sm">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          iconColorMap[iconColor],
        )}
      >
        {icon}
      </div>
      <p className="mt-4 text-[13px] font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-[26px] font-bold tracking-tight text-ink tabular-nums leading-none">
        {value}
      </p>
      {trend && (
        <p className="mt-1.5 text-[11px] text-ink-xmuted">{trend}</p>
      )}
    </div>
  );
}

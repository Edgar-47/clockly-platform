import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/types/late-arrival";
import type { LateArrivalStatus } from "@/types/late-arrival";

const STATUS_VARIANT: Record<LateArrivalStatus, "warning" | "success" | "danger" | "default"> = {
  pending: "warning",
  justified: "success",
  unjustified: "danger",
  ignored: "default",
};

export function LateArrivalStatusBadge({ status }: { status: LateArrivalStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "default"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

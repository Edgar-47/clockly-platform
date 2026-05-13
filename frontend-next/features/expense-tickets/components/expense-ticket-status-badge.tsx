import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, PAYMENT_SOURCE_LABELS, STATUS_LABELS } from "@/types/expense-ticket";
import type { ExpenseCategory, ExpenseStatus, PaymentSource } from "@/types/expense-ticket";

const STATUS_VARIANT: Record<ExpenseStatus, "warning" | "success" | "danger" | "default"> = {
  pending: "warning",
  in_review: "default",
  approved: "success",
  rejected: "danger",
  paid: "success",
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "default"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function ExpenseCategoryBadge({ category }: { category: ExpenseCategory }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface-bg px-2 py-0.5 text-[11px] font-medium text-ink-muted">
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

export function PaymentSourceBadge({ source }: { source: PaymentSource }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
      {PAYMENT_SOURCE_LABELS[source] ?? source}
    </span>
  );
}

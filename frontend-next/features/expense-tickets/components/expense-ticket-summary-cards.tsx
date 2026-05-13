import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExpenseTicketSummary } from "@/types/expense-ticket";

function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function SummaryCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "danger" | "success" | "warning";
}) {
  const valueColor =
    highlight === "danger"
      ? "text-danger-DEFAULT"
      : highlight === "success"
        ? "text-success-DEFAULT"
        : highlight === "warning"
          ? "text-warning-DEFAULT"
          : "text-ink";

  return (
    <Card className="shadow-xs">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-xmuted">{label}</p>
        <p className={`mt-1 text-[22px] font-bold tabular-nums leading-none ${valueColor}`}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-ink-muted">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ExpenseTicketSummaryCards({
  summary,
  loading,
  currency = "EUR",
}: {
  summary?: ExpenseTicketSummary;
  loading?: boolean;
  currency?: string;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="shadow-xs">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const fmt = (n: number) => formatCurrency(n, currency);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <SummaryCard
        label="Total gastos"
        value={fmt(summary.total_amount)}
        sub={`${summary.total_count} tickets · media ${fmt(summary.avg_amount)}`}
      />
      <SummaryCard
        label="Pendientes"
        value={fmt(summary.pending_amount + summary.in_review_amount)}
        sub="Pendiente + en revisión"
        highlight="warning"
      />
      <SummaryCard
        label="Aprobados"
        value={fmt(summary.approved_amount)}
        highlight="success"
      />
      <SummaryCard
        label="Rechazados"
        value={fmt(summary.rejected_amount)}
        highlight="danger"
      />
      <SummaryCard
        label="Pagados"
        value={fmt(summary.paid_amount)}
        sub={
          summary.pending_reimbursement_amount > 0
            ? `Pendiente reembolso: ${fmt(summary.pending_reimbursement_amount)}`
            : undefined
        }
        highlight="success"
      />
    </div>
  );
}

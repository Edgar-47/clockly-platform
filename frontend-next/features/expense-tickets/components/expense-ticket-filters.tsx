"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LABELS,
  PAYMENT_SOURCE_LABELS,
  STATUS_LABELS,
} from "@/types/expense-ticket";
import type {
  ExpenseCategory,
  ExpenseStatus,
  ExpenseTicketFilters,
  PaymentSource,
} from "@/types/expense-ticket";

interface Props {
  filters: ExpenseTicketFilters;
  onChange: (filters: ExpenseTicketFilters) => void;
}

export function ExpenseTicketFilters({ filters, onChange }: Props) {
  function update(key: keyof ExpenseTicketFilters, value: string | undefined) {
    onChange({ ...filters, [key]: value || undefined, offset: 0 });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Buscar concepto…"
        className="h-8 w-[180px] text-[13px]"
        value={filters.search ?? ""}
        onChange={(e) => update("search", e.target.value)}
      />

      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) => update("status", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[150px] text-[13px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {(Object.keys(STATUS_LABELS) as ExpenseStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category ?? "all"}
        onValueChange={(v) => update("category", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[150px] text-[13px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.payment_source ?? "all"}
        onValueChange={(v) => update("payment_source", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[180px] text-[13px]">
          <SelectValue placeholder="Método pago" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los métodos</SelectItem>
          {(Object.keys(PAYMENT_SOURCE_LABELS) as PaymentSource[]).map((p) => (
            <SelectItem key={p} value={p}>
              {PAYMENT_SOURCE_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={
          filters.requires_reimbursement === undefined
            ? "all"
            : filters.requires_reimbursement
              ? "yes"
              : "no"
        }
        onValueChange={(v) =>
          onChange({
            ...filters,
            requires_reimbursement:
              v === "all" ? undefined : v === "yes" ? true : false,
            offset: 0,
          })
        }
      >
        <SelectTrigger className="h-8 w-[160px] text-[13px]">
          <SelectValue placeholder="Reembolso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="yes">Con reembolso</SelectItem>
          <SelectItem value="no">Sin reembolso</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          type="date"
          className="h-8 w-[140px] text-[13px]"
          value={filters.date_from ?? ""}
          onChange={(e) => update("date_from", e.target.value)}
        />
        <span className="text-[12px] text-ink-muted">–</span>
        <Input
          type="date"
          className="h-8 w-[140px] text-[13px]"
          value={filters.date_to ?? ""}
          onChange={(e) => update("date_to", e.target.value)}
        />
      </div>
    </div>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/types/employee";
import type { WorkLocation } from "@/types/location";
import type {
  CashClosureAnalyticsFilters,
  CashClosureFilters,
  CashClosurePaymentType,
  CashClosurePeriod,
  CashClosureShift,
} from "@/types/cash-closure";
import {
  CASH_CLOSURE_PAYMENT_LABELS,
  CASH_CLOSURE_PERIOD_LABELS,
  CASH_CLOSURE_SHIFT_LABELS,
} from "@/types/cash-closure";

type Filters = CashClosureFilters & CashClosureAnalyticsFilters;

export function CashClosureFiltersBar({
  filters,
  employees,
  locations,
  showAnalyticsFilters,
  onChange,
}: {
  filters: Filters;
  employees: Employee[];
  locations: WorkLocation[];
  showAnalyticsFilters?: boolean;
  onChange: (filters: Filters) => void;
}) {
  function update(key: keyof Filters, value: string | boolean | undefined) {
    onChange({ ...filters, [key]: value, offset: 0 });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-1">
        <Input
          type="date"
          className="h-8 w-[140px] text-[13px]"
          value={filters.date_from ?? ""}
          onChange={(event) => update("date_from", event.target.value || undefined)}
        />
        <span className="text-[12px] text-ink-muted">-</span>
        <Input
          type="date"
          className="h-8 w-[140px] text-[13px]"
          value={filters.date_to ?? ""}
          onChange={(event) => update("date_to", event.target.value || undefined)}
        />
      </div>

      <Select
        value={filters.shift ?? "all"}
        onValueChange={(value) => update("shift", value === "all" ? undefined : (value as CashClosureShift))}
      >
        <SelectTrigger className="h-8 w-[145px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los turnos</SelectItem>
          {Object.entries(CASH_CLOSURE_SHIFT_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.closed_by_user_id ?? "all"}
        onValueChange={(value) => update("closed_by_user_id", value === "all" ? undefined : value)}
      >
        <SelectTrigger className="h-8 w-[170px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los usuarios</SelectItem>
          {employees
            .filter((employee) => employee.user_id)
            .map((employee) => (
              <SelectItem key={employee.user_id} value={employee.user_id!}>
                {employee.full_name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.location_id ?? "all"}
        onValueChange={(value) => update("location_id", value === "all" ? undefined : value)}
      >
        <SelectTrigger className="h-8 w-[160px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los locales</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.has_incidence === undefined ? "all" : filters.has_incidence ? "yes" : "no"}
        onValueChange={(value) =>
          update("has_incidence", value === "all" ? undefined : value === "yes")
        }
      >
        <SelectTrigger className="h-8 w-[145px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="yes">Con incidencia</SelectItem>
          <SelectItem value="no">Sin incidencia</SelectItem>
        </SelectContent>
      </Select>

      {showAnalyticsFilters && (
        <>
          <Select
            value={filters.payment_type ?? "all"}
            onValueChange={(value) => update("payment_type", value as CashClosurePaymentType)}
          >
            <SelectTrigger className="h-8 w-[130px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CASH_CLOSURE_PAYMENT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.period ?? "day"}
            onValueChange={(value) => update("period", value as CashClosurePeriod)}
          >
            <SelectTrigger className="h-8 w-[120px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CASH_CLOSURE_PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}

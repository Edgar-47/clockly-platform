"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from "@/types/late-arrival";
import type { LateArrivalFilters, LateArrivalStatus } from "@/types/late-arrival";

interface Props {
  filters: LateArrivalFilters;
  onChange: (filters: LateArrivalFilters) => void;
}

export function LateArrivalFiltersBar({ filters, onChange }: Props) {
  function update(key: keyof LateArrivalFilters, value: string | number | undefined) {
    onChange({ ...filters, [key]: value || undefined, offset: 0 });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) => update("status", v === "all" ? undefined : (v as LateArrivalStatus))}
      >
        <SelectTrigger className="h-8 w-[170px] text-[13px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {(Object.keys(STATUS_LABELS) as LateArrivalStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
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

      <Input
        type="number"
        placeholder="Min. retraso (min)"
        className="h-8 w-[160px] text-[13px]"
        min={1}
        value={filters.min_delay_minutes ?? ""}
        onChange={(e) => update("min_delay_minutes", e.target.value ? Number(e.target.value) : undefined)}
      />
    </div>
  );
}

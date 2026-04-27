"use client";

import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkLocation } from "@/types/location";

export interface LocationFilterState {
  date_from: string;
  date_to: string;
  employee_id?: string;
  location_status?: string;
  event_type?: string;
}

interface LocationFiltersProps {
  value: LocationFilterState;
  onChange: (v: LocationFilterState) => void;
  workLocations: WorkLocation[];
}

const DATE_PRESETS = [
  { label: "Hoy", getValue: () => ({ from: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"), to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss") }) },
  { label: "Ayer", getValue: () => ({ from: format(startOfDay(subDays(new Date(), 1)), "yyyy-MM-dd'T'HH:mm:ss"), to: format(endOfDay(subDays(new Date(), 1)), "yyyy-MM-dd'T'HH:mm:ss") }) },
  { label: "7 días", getValue: () => ({ from: format(startOfDay(subDays(new Date(), 6)), "yyyy-MM-dd'T'HH:mm:ss"), to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss") }) },
];

export function LocationFilters({ value, onChange, workLocations }: LocationFiltersProps) {
  const setPreset = (preset: (typeof DATE_PRESETS)[number]) => {
    const { from, to } = preset.getValue();
    onChange({ ...value, date_from: from, date_to: to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-3.5 w-3.5 shrink-0 text-ink-muted" />

      {/* Date presets */}
      <div className="flex gap-1">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={() => setPreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Status filter */}
      <select
        value={value.location_status ?? ""}
        onChange={(e) => onChange({ ...value, location_status: e.target.value || undefined })}
        className="h-7 rounded-md border border-border bg-white px-2 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Todo estado</option>
        <option value="in_range">En rango</option>
        <option value="out_of_range">Fuera de rango</option>
        <option value="unknown">Sin ubicación</option>
      </select>

      {/* Event type filter */}
      <select
        value={value.event_type ?? ""}
        onChange={(e) => onChange({ ...value, event_type: e.target.value || undefined })}
        className="h-7 rounded-md border border-border bg-white px-2 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Entrada y salida</option>
        <option value="clock_in">Solo entradas</option>
        <option value="clock_out">Solo salidas</option>
      </select>

      {/* Work location filter — for future server-side filtering */}
      {workLocations.length > 0 && (
        <select
          className="h-7 rounded-md border border-border bg-white px-2 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
          defaultValue=""
        >
          <option value="">Todos los centros</option>
          {workLocations.map((wl) => (
            <option key={wl.id} value={wl.id}>
              {wl.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

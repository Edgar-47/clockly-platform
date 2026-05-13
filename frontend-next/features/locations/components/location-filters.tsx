"use client";

import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
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
  {
    label: "Hoy",
    getValue: () => ({
      from: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
      to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
    }),
  },
  {
    label: "Ayer",
    getValue: () => ({
      from: format(startOfDay(subDays(new Date(), 1)), "yyyy-MM-dd'T'HH:mm:ss"),
      to: format(endOfDay(subDays(new Date(), 1)), "yyyy-MM-dd'T'HH:mm:ss"),
    }),
  },
  {
    label: "7 días",
    getValue: () => ({
      from: format(startOfDay(subDays(new Date(), 6)), "yyyy-MM-dd'T'HH:mm:ss"),
      to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
    }),
  },
];

const selectCls =
  "h-8 rounded-lg border border-border bg-white px-2.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors";

export function LocationFilters({
  value,
  onChange,
  workLocations,
}: LocationFiltersProps) {
  const activePreset = DATE_PRESETS.find((p) => {
    const { from, to } = p.getValue();
    return value.date_from === from && value.date_to === to;
  });

  const setPreset = (preset: (typeof DATE_PRESETS)[number]) => {
    const { from, to } = preset.getValue();
    onChange({ ...value, date_from: from, date_to: to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date presets */}
      <div className="flex rounded-lg border border-border bg-white shadow-xs overflow-hidden">
        {DATE_PRESETS.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => setPreset(preset)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium transition-colors border-r border-border last:border-r-0",
                isActive
                  ? "bg-primary text-white"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <select
        value={value.location_status ?? ""}
        onChange={(e) =>
          onChange({ ...value, location_status: e.target.value || undefined })
        }
        className={selectCls}
      >
        <option value="">Todo estado</option>
        <option value="in_range">En rango</option>
        <option value="out_of_range">Fuera de rango</option>
        <option value="unknown">Sin ubicación</option>
      </select>

      {/* Event type filter */}
      <select
        value={value.event_type ?? ""}
        onChange={(e) =>
          onChange({ ...value, event_type: e.target.value || undefined })
        }
        className={selectCls}
      >
        <option value="">Entrada y salida</option>
        <option value="clock_in">Solo entradas</option>
        <option value="clock_out">Solo salidas</option>
      </select>

      {/* Work location filter */}
      {workLocations.length > 0 && (
        <select className={selectCls} defaultValue="">
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

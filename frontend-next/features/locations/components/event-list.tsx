"use client";

import { ArrowDownCircle, ArrowUpCircle, MapPin, MapPinOff } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AttendanceLocationEvent } from "@/types/location";

interface EventListProps {
  events: AttendanceLocationEvent[];
  selectedId: string | null;
  onSelect: (id: string, event: AttendanceLocationEvent) => void;
}

const STATUS_CLASSES: Record<string, string> = {
  in_range: "bg-success-bg text-success-DEFAULT border-success-border",
  out_of_range: "bg-danger-bg text-danger-DEFAULT border-danger-border",
  unknown: "bg-surface-bg text-ink-muted border-border",
};

const STATUS_LABELS: Record<string, string> = {
  in_range: "En rango",
  out_of_range: "Fuera de rango",
  unknown: "Sin ubicación",
};

function StatusChip({ status }: { status: string | null }) {
  const key = status ?? "unknown";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        STATUS_CLASSES[key] ?? STATUS_CLASSES.unknown,
      )}
    >
      {key === "in_range" ? (
        <MapPin className="h-2.5 w-2.5" />
      ) : key === "out_of_range" ? (
        <MapPinOff className="h-2.5 w-2.5" />
      ) : null}
      {STATUS_LABELS[key] ?? key}
    </span>
  );
}

export function EventList({ events, selectedId, onSelect }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MapPin className="mb-3 h-8 w-8 text-ink-xmuted" />
        <p className="text-[13px] font-medium text-ink-muted">Sin fichajes con ubicación</p>
        <p className="mt-1 text-[12px] text-ink-xmuted">
          Los empleados deben aceptar permisos de ubicación al fichar.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-y-auto">
      {events.map((event) => {
        const key = `${event.session_id}-${event.event_type}`;
        const isSelected = selectedId === key;
        const name = event.employee?.full_name ?? "Empleado";
        const [first = "", ...rest] = name.split(" ");
        const last = rest.join(" ");

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(key, event)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-bg",
                isSelected && "bg-primary/5",
              )}
            >
              {/* Avatar */}
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {getInitials(first, last)}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {event.event_type === "clock_in" ? (
                    <ArrowUpCircle className="h-3.5 w-3.5 shrink-0 text-success-DEFAULT" />
                  ) : (
                    <ArrowDownCircle className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  )}
                  <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
                </div>
                <p className="mt-0.5 text-[11px] tabular-nums text-ink-xmuted">
                  {formatDateTime(event.occurred_at)}
                </p>
                {event.distance_meters != null && (
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {Math.round(event.distance_meters)} m del centro
                  </p>
                )}
              </div>

              {/* Status chip */}
              <div className="shrink-0 pt-0.5">
                <StatusChip status={event.location_status} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

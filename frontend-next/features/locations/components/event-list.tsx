"use client";

import { ArrowDownCircle, ArrowUpCircle, MapPin, MapPinOff } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { getInitials, cn } from "@/lib/utils";
import type { AttendanceLocationEvent } from "@/types/location";

interface EventListProps {
  events: AttendanceLocationEvent[];
  selectedId: string | null;
  onSelect: (id: string, event: AttendanceLocationEvent) => void;
  companyTimeZone?: string;
}

const STATUS_STYLES: Record<string, { chip: string; dot: string }> = {
  in_range: {
    chip: "bg-success-bg text-success-DEFAULT border-success-border",
    dot: "bg-success-DEFAULT",
  },
  out_of_range: {
    chip: "bg-danger-bg text-danger-DEFAULT border-danger-border",
    dot: "bg-danger-DEFAULT",
  },
  unknown: {
    chip: "bg-surface-bg text-ink-muted border-border",
    dot: "bg-ink-xmuted",
  },
};

const STATUS_LABELS: Record<string, string> = {
  in_range: "En rango",
  out_of_range: "Fuera de rango",
  unknown: "Sin ubicación",
};

const AVATAR_COLORS = [
  "bg-violet-500/15 text-violet-600",
  "bg-blue-500/15 text-blue-600",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
  "bg-pink-500/15 text-pink-600",
  "bg-cyan-500/15 text-cyan-600",
  "bg-orange-500/15 text-orange-600",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function StatusChip({ status }: { status: string | null }) {
  const key = status ?? "unknown";
  const styles = STATUS_STYLES[key] ?? STATUS_STYLES.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        styles.chip,
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

export function EventList({
  events,
  selectedId,
  onSelect,
  companyTimeZone,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-5">
        <div className="h-12 w-12 rounded-full bg-surface-bg flex items-center justify-center mb-3">
          <MapPin className="h-6 w-6 text-ink-xmuted" />
        </div>
        <p className="text-[13px] font-medium text-ink-muted">
          Sin fichajes con ubicación
        </p>
        <p className="mt-1 text-[12px] text-ink-xmuted">
          Los empleados deben aceptar permisos de ubicación al fichar.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {events.map((event) => {
        const key = `${event.session_id}-${event.event_type}`;
        const isSelected = selectedId === key;
        const name = event.employee?.full_name ?? "Empleado";
        const [first = "", ...rest] = name.split(" ");
        const last = rest.join(" ");
        const isEntry = event.event_type === "clock_in";

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(key, event)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/50",
                isSelected && "bg-primary/[0.04] border-l-2 border-l-primary pl-[14px]",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  avatarColor(name),
                )}
              >
                {getInitials(first, last)}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {isEntry ? (
                    <ArrowUpCircle className="h-3.5 w-3.5 shrink-0 text-success-DEFAULT" />
                  ) : (
                    <ArrowDownCircle className="h-3.5 w-3.5 shrink-0 text-danger-DEFAULT" />
                  )}
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {name}
                  </p>
                </div>
                <p className="text-[11px] tabular-nums text-ink-xmuted">
                  {isEntry ? "Entrada" : "Salida"} ·{" "}
                  {formatDateTime(event.occurred_at, companyTimeZone)}
                </p>
                {event.distance_meters != null && (
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {Math.round(event.distance_meters)} m del centro de trabajo
                  </p>
                )}
              </div>

              {/* Status */}
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

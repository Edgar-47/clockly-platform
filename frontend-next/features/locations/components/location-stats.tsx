"use client";

import { MapPin, MapPinOff, HelpCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { LocationSummary } from "@/types/location";

interface LocationStatsProps {
  summary: LocationSummary | undefined;
  loading?: boolean;
}

const STATS = [
  {
    key: "in_range" as const,
    label: "En rango",
    icon: MapPin,
    value: (s: LocationSummary) => s.in_range,
    color: "text-success-DEFAULT",
    iconBg: "bg-success-bg",
    border: "border-success-border",
  },
  {
    key: "out_of_range" as const,
    label: "Fuera de rango",
    icon: MapPinOff,
    value: (s: LocationSummary) => s.out_of_range,
    color: "text-danger-DEFAULT",
    iconBg: "bg-danger-bg",
    border: "border-danger-border",
  },
  {
    key: "unknown" as const,
    label: "Sin ubicación",
    icon: HelpCircle,
    value: (s: LocationSummary) => s.unknown,
    color: "text-ink-muted",
    iconBg: "bg-surface-bg",
    border: "border-border",
  },
  {
    key: "incidents" as const,
    label: "Con incidencias",
    icon: AlertCircle,
    value: (s: LocationSummary) => s.employees_with_incidents,
    color: "text-warning-DEFAULT",
    iconBg: "bg-warning-bg",
    border: "border-warning-border",
  },
];

export function LocationStats({ summary, loading }: LocationStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATS.map(({ key, label, icon: Icon, value, color, iconBg, border }) => (
        <div
          key={key}
          className={`flex items-center gap-3 rounded-xl border ${border} bg-white px-4 py-3 shadow-xs`}
        >
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}
          >
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            {loading ? (
              <>
                <Skeleton className="h-5 w-8 mb-1" />
                <Skeleton className="h-2.5 w-16" />
              </>
            ) : (
              <>
                <p className={`text-[20px] font-bold tabular-nums leading-none ${color}`}>
                  {summary ? value(summary) : 0}
                </p>
                <p className="text-[11px] text-ink-xmuted mt-0.5">{label}</p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

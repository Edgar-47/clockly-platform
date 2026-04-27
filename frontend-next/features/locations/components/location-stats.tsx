"use client";

import { MapPin, MapPinOff, HelpCircle, AlertCircle } from "lucide-react";
import type { LocationSummary } from "@/types/location";

interface LocationStatsProps {
  summary: LocationSummary | undefined;
  loading?: boolean;
}

export function LocationStats({ summary, loading }: LocationStatsProps) {
  const stats = [
    {
      label: "En rango",
      value: summary?.in_range ?? 0,
      icon: MapPin,
      color: "text-success-DEFAULT",
      bg: "bg-success-bg",
    },
    {
      label: "Fuera de rango",
      value: summary?.out_of_range ?? 0,
      icon: MapPinOff,
      color: "text-danger-DEFAULT",
      bg: "bg-danger-bg",
    },
    {
      label: "Sin ubicación",
      value: summary?.unknown ?? 0,
      icon: HelpCircle,
      color: "text-ink-muted",
      bg: "bg-surface-bg",
    },
    {
      label: "Empleados con incidencias",
      value: summary?.employees_with_incidents ?? 0,
      icon: AlertCircle,
      color: "text-warning-DEFAULT",
      bg: "bg-warning-bg",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={`flex items-center gap-2.5 rounded-lg border border-border ${bg} px-3 py-2`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${color}`} />
          <div>
            <p className={`text-[18px] font-bold tabular-nums ${loading ? "animate-pulse" : ""} ${color}`}>
              {loading ? "—" : value}
            </p>
            <p className="text-[10px] text-ink-muted">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

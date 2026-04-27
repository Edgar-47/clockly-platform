"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { MapPin } from "lucide-react";
import { useAttendanceLocationEvents, useLocationSummary, useWorkLocations } from "@/hooks/use-locations";
import { EventList } from "@/features/locations/components/event-list";
import { LocationFilters, type LocationFilterState } from "@/features/locations/components/location-filters";
import { LocationStats } from "@/features/locations/components/location-stats";
import type { AttendanceLocationEvent } from "@/types/location";

// Leaflet must not run on the server
const AttendanceMap = dynamic(
  () => import("@/features/locations/components/attendance-map").then((m) => m.AttendanceMap),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded-lg bg-surface-bg" /> },
);

// Leaflet CSS
import "leaflet/dist/leaflet.css";

function todayFilter(): LocationFilterState {
  return {
    date_from: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
    date_to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
  };
}

export default function LocationsPage() {
  const [filters, setFilters] = useState<LocationFilterState>(todayFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AttendanceLocationEvent | null>(null);

  const { data: eventsData, isLoading: eventsLoading } = useAttendanceLocationEvents({
    date_from: filters.date_from,
    date_to: filters.date_to,
    location_status: filters.location_status,
    limit: 200,
  });

  const { data: workLocations = [] } = useWorkLocations();

  const { data: summary, isLoading: summaryLoading } = useLocationSummary({
    date_from: filters.date_from,
    date_to: filters.date_to,
  });

  const allEvents = eventsData?.items ?? [];
  const filteredEvents =
    filters.event_type
      ? allEvents.filter((e) => e.event_type === filters.event_type)
      : allEvents;

  const handleSelectEvent = (id: string, event: AttendanceLocationEvent) => {
    setSelectedId(id);
    setSelectedEvent(event);
  };

  return (
    <div className="flex h-[calc(100vh-62px)] flex-col gap-4 p-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-[15px] font-bold text-ink">Localizaciones</h1>
            <p className="text-[12px] text-ink-xmuted">
              Mapa de fichajes — solo se registra la ubicación puntual del fichaje
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <LocationStats summary={summary} loading={summaryLoading} />

      {/* Filters */}
      <LocationFilters value={filters} onChange={setFilters} workLocations={workLocations} />

      {/* Map + List layout */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Map */}
        <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-surface-bg">
          {eventsLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          <AttendanceMap
            events={filteredEvents}
            workLocations={workLocations}
            selectedEventId={selectedId}
            onSelectEvent={(ev) => {
              const id = `${ev.session_id}-${ev.event_type}`;
              handleSelectEvent(id, ev);
            }}
          />
        </div>

        {/* Sidebar */}
        <div className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">
              Fichajes{" "}
              <span className="ml-1 rounded-full bg-surface-bg px-1.5 py-0.5 text-[11px] font-normal text-ink-muted">
                {filteredEvents.length}
              </span>
            </p>
            {selectedEvent && (
              <p className="mt-0.5 truncate text-[11px] text-ink-xmuted">
                Seleccionado: {selectedEvent.employee?.full_name}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <EventList
              events={filteredEvents}
              selectedId={selectedId}
              onSelect={handleSelectEvent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

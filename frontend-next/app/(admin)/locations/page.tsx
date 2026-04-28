"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { Download } from "lucide-react";
import {
  useAttendanceLocationEvents,
  useLocationSummary,
  useWorkLocations,
} from "@/hooks/use-locations";
import { useMe } from "@/hooks/use-auth";
import { EventList } from "@/features/locations/components/event-list";
import {
  LocationFilters,
  type LocationFilterState,
} from "@/features/locations/components/location-filters";
import { LocationStats } from "@/features/locations/components/location-stats";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/shared/topbar";
import type { AttendanceLocationEvent } from "@/types/location";

const AttendanceMap = dynamic(
  () =>
    import("@/features/locations/components/attendance-map").then(
      (m) => m.AttendanceMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full animate-pulse rounded-xl bg-surface-bg" />
    ),
  },
);

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
  const [selectedEvent, setSelectedEvent] =
    useState<AttendanceLocationEvent | null>(null);
  const me = useMe();

  const { data: eventsData, isLoading: eventsLoading } =
    useAttendanceLocationEvents({
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
  const filteredEvents = filters.event_type
    ? allEvents.filter((e) => e.event_type === filters.event_type)
    : allEvents;

  if (me.data && !me.data.company.has_geolocation) {
    return (
      <div className="flex h-[calc(100vh-62px)] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-warning-border bg-warning-bg p-6 text-center">
          <h1 className="text-[14px] font-bold text-ink">
            Geolocalización disponible en Pro
          </h1>
          <p className="mt-2 text-[13px] text-ink-muted">
            Activa un plan con geolocalización para ver fichajes en mapa y
            validar ubicaciones.
          </p>
          <Button asChild className="mt-5" size="sm">
            <Link href="/upgrade">Ver planes</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSelectEvent = (id: string, event: AttendanceLocationEvent) => {
    setSelectedId(id);
    setSelectedEvent(event);
  };

  return (
    <>
      <Topbar
        title="Localizaciones"
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        }
      />

      {/* On mobile: scrollable column. On desktop: fixed-height split view. */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:h-[calc(100vh-62px)]">
        {/* Stats */}
        <LocationStats summary={summary} loading={summaryLoading} />

        {/* Filters */}
        <LocationFilters
          value={filters}
          onChange={setFilters}
          workLocations={workLocations}
        />

        {/* Map + List layout: stacked on mobile, side-by-side on lg+ */}
        <div className="flex min-h-0 flex-col gap-4 lg:flex-1 lg:flex-row">
          {/* Map — fixed height on mobile, flexible on desktop */}
          <div className="relative h-[320px] overflow-hidden rounded-xl border border-border bg-surface-bg shadow-xs sm:h-[400px] lg:h-auto lg:flex-1">
            {eventsLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
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
              companyTimeZone={me.data?.company.timezone}
            />
          </div>

          {/* Event list — full width on mobile, fixed-width sidebar on desktop */}
          <div className="flex max-h-[380px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xs lg:max-h-none lg:w-[320px]">
            <div className="flex-shrink-0 border-b border-border px-4 py-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">
                  Fichajes con coordenadas
                </p>
                <span className="rounded-full bg-surface-bg border border-border px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                  {filteredEvents.length} registros
                </span>
              </div>
              {selectedEvent && (
                <p className="mt-1 truncate text-[11px] text-ink-xmuted">
                  → {selectedEvent.employee?.full_name}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <EventList
                events={filteredEvents}
                selectedId={selectedId}
                onSelect={handleSelectEvent}
                companyTimeZone={me.data?.company.timezone}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

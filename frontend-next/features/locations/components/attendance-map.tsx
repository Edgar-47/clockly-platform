"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { AttendanceLocationEvent } from "@/types/location";
import type { WorkLocation } from "@/types/location";

interface AttendanceMapProps {
  events: AttendanceLocationEvent[];
  workLocations: WorkLocation[];
  selectedEventId?: string | null;
  onSelectEvent?: (event: AttendanceLocationEvent) => void;
  companyTimeZone?: string;
  initialCenter?: [number, number];
}

const STATUS_COLORS: Record<string, string> = {
  in_range: "#16a34a",
  out_of_range: "#dc2626",
  unknown: "#9ca3af",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function AttendanceMap({
  events,
  workLocations,
  selectedEventId,
  onSelectEvent,
  companyTimeZone,
  initialCenter,
}: AttendanceMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const initialCenterRef = useRef(initialCenter);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapRef.current) return;
    if (!containerRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default marker icon path broken by webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = initialCenterRef.current ?? [40.416775, -3.70379];

      const map = L.map(containerRef.current!, {
        center,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render work location circles
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      // Remove old circles (tracked by a layer group on the map)
      (mapRef.current as unknown as { _wlGroup?: L.LayerGroup })._wlGroup?.clearLayers();

      const group = L.layerGroup().addTo(mapRef.current!);
      (mapRef.current as unknown as { _wlGroup?: L.LayerGroup })._wlGroup = group;

      for (const wl of workLocations) {
        if (wl.latitude == null || wl.longitude == null) continue;
        L.circle([wl.latitude, wl.longitude], {
          radius: wl.allowed_radius_meters,
          color: "#6366f1",
          fillColor: "#6366f1",
          fillOpacity: 0.07,
          weight: 2,
        })
          .bindTooltip(wl.name, { permanent: false })
          .addTo(group);
      }
    });
  }, [workLocations]);

  // Render attendance event markers
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      const geoEvents = events.filter((e) => e.latitude != null && e.longitude != null);
      if (geoEvents.length === 0) return;

      const bounds: [number, number][] = [];

      for (const event of geoEvents) {
        const lat = event.latitude!;
        const lng = event.longitude!;
        const color = STATUS_COLORS[event.location_status ?? "unknown"];
        const initials = getInitials(event.employee?.full_name ?? "?");
        const eventLabel = event.event_type === "clock_in" ? "↑" : "↓";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${color};
            color:white;
            border-radius:50%;
            width:34px;height:34px;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,.25);
            cursor:pointer;
          ">
            <span title="${event.employee?.full_name ?? ''}">${initials}</span>
            <span style="position:absolute;bottom:-6px;right:-4px;font-size:9px;background:#1e293b;border-radius:3px;padding:0 2px;line-height:14px;">${eventLabel}</span>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([lat, lng], { icon })
          .bindPopup(buildPopupHtml(event, companyTimeZone))
          .addTo(mapRef.current!);

        marker.on("click", () => onSelectEvent?.(event));

        const key = `${event.session_id}-${event.event_type}`;
        markersRef.current.set(key, marker);
        bounds.push([lat, lng]);
      }

      if (bounds.length > 0 && !selectedEventId) {
        mapRef.current!.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  }, [companyTimeZone, events, onSelectEvent, selectedEventId]);

  // Pan to selected event
  useEffect(() => {
    if (!selectedEventId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedEventId);
    if (marker) {
      const latlng = marker.getLatLng();
      mapRef.current.setView(latlng, 16, { animate: true });
      marker.openPopup();
    }
  }, [selectedEventId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}

function buildPopupHtml(event: AttendanceLocationEvent, companyTimeZone?: string): string {
  const name = event.employee?.full_name ?? "Empleado";
  const type = event.event_type === "clock_in" ? "Entrada" : "Salida";
  const time = new Date(event.occurred_at).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: companyTimeZone,
  });
  const statusLabel: Record<string, string> = {
    in_range: "En rango",
    out_of_range: "Fuera de rango",
    unknown: "Sin ubicación",
  };
  const status = statusLabel[event.location_status ?? "unknown"] ?? "Desconocido";
  const dist =
    event.distance_meters != null ? `${Math.round(event.distance_meters)} m` : "—";
  const acc =
    event.accuracy_meters != null ? `±${Math.round(event.accuracy_meters)} m` : "—";

  return `
    <div style="font-size:13px;min-width:180px;">
      <p style="font-weight:700;margin:0 0 4px">${name}</p>
      <p style="margin:0 0 2px;color:#64748b">${type} · ${time}</p>
      <p style="margin:0 0 2px">Estado: <b>${status}</b></p>
      <p style="margin:0 0 2px">Distancia: ${dist}</p>
      <p style="margin:0;color:#94a3b8">Precisión GPS: ${acc}</p>
    </div>
  `;
}

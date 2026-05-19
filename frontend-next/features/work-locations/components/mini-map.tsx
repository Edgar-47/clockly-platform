"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type LeafletContainer = HTMLDivElement & { _leaflet_id?: number };

interface MiniMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  label?: string;
}

export function MiniMap({ latitude, longitude, radiusMeters, label }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapRef.current) return;
    if (!containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current as LeafletContainer;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const target = containerRef.current as LeafletContainer;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // React Strict Mode can resolve an old dynamic import after cleanup.
      // Clearing Leaflet's marker prevents "Map container is already initialized".
      target._leaflet_id = undefined;
      delete target._leaflet_id;

      let map: LeafletMap;
      try {
        map = L.map(target, {
          center: [latitude, longitude],
          zoom: 16,
          zoomControl: false,
          scrollWheelZoom: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          attributionControl: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Map container is already initialized")) {
          return;
        }
        throw error;
      }

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Radius circle
      L.circle([latitude, longitude], {
        radius: radiusMeters,
        color: "#FF6B35",
        fillColor: "#FF6B35",
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      // Center marker with custom pin
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;
          background:#FF6B35;
          border:3px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([latitude, longitude], { icon }).addTo(map);
      if (label) marker.bindTooltip(label, { permanent: false });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      delete container._leaflet_id;
    };
  }, [latitude, longitude, radiusMeters, label]);

  return <div ref={containerRef} className="isolate h-full w-full" />;
}

"use client";

import { useCallback, useState } from "react";
import type { GeoPayload, LocationPermissionStatus } from "@/types/location";

interface GeolocationOptions {
  maximumAge?: number;
  timeout?: number;
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const { maximumAge = 30_000, timeout = 7_000 } = options;
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>("unknown");

  const capture = useCallback((): Promise<GeoPayload> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setPermissionStatus("unavailable");
        resolve({ location_permission_status: "unavailable", location_source: "browser" });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPermissionStatus("granted");
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy_meters: pos.coords.accuracy,
            location_permission_status: "granted",
            location_source: "browser",
          });
        },
        (err) => {
          const status: LocationPermissionStatus =
            err.code === GeolocationPositionError.PERMISSION_DENIED ? "denied" : "unavailable";
          setPermissionStatus(status);
          resolve({ location_permission_status: status, location_source: "browser" });
        },
        { enableHighAccuracy: true, timeout, maximumAge },
      );
    });
  }, [maximumAge, timeout]);

  return { capture, permissionStatus };
}

"use client";

import AMapLoader from "@amap/amap-jsapi-loader";
import { useEffect, useRef, useState } from "react";
import { trip, type Day } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";

const MAP_CENTER: [number, number] = [87.6168, 43.8256];
const MAP_ZOOM = 6;

function createMarkerContent(name: string, color: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
      <div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
      <div style="margin-top:3px;background:rgba(255,255,255,0.92);color:#111;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.15);">${name}</div>
    </div>
  `;
}

function RoutePolylines({ map }: { map: AMap.Map }) {
  const activeDayId = useTripStore((state) => state.activeDayId);
  const hoveredDayId = useTripStore((state) => state.hoveredDayId);
  const setActiveDay = useTripStore((state) => state.setActiveDay);
  const setHoveredDay = useTripStore((state) => state.setHoveredDay);
  const polylinesRef = useRef<AMap.Polyline[]>([]);

  useEffect(() => {
    const polylines = trip.days
      .filter((day) => day.coordinates.length > 0)
      .map((day) => {
        const polyline = new AMap.Polyline({
          path: day.coordinates,
          strokeColor: day.color,
          strokeWeight: 3,
          strokeOpacity: 0.5,
          lineCap: "round",
          lineJoin: "round",
          extData: { dayId: day.id },
          cursor: "pointer",
        });
        polyline.on("click", () => setActiveDay(day.id));
        polyline.on("mouseover", () => setHoveredDay(day.id));
        polyline.on("mouseout", () => setHoveredDay(null));
        return polyline;
      });
    map.add(polylines);
    polylinesRef.current = polylines;
    return () => {
      map.remove(polylines);
      polylinesRef.current = [];
    };
  }, [map, setActiveDay, setHoveredDay]);

  useEffect(() => {
    polylinesRef.current.forEach((polyline) => {
      const dayId = polyline.getExtData()?.dayId;
      const isActive = dayId === activeDayId;
      const isHovered = dayId === hoveredDayId;
      polyline.setOptions({
        strokeWeight: isActive ? 6 : isHovered ? 5 : 3,
        strokeOpacity: isActive ? 1 : isHovered ? 0.95 : 0.5,
        zIndex: isActive ? 100 : isHovered ? 50 : 1,
      });
    });
  }, [activeDayId, hoveredDayId]);

  return null;
}

function DayMarkers({ map }: { map: AMap.Map }) {
  const activeDayId = useTripStore((state) => state.activeDayId);
  const markersRef = useRef<AMap.Marker[]>([]);

  useEffect(() => {
    map.remove(markersRef.current);
    markersRef.current = [];

    const day = trip.days.find((d) => d.id === activeDayId);
    if (!day) return;

    const markers = day.points.map((point) => {
      return new AMap.Marker({
        position: point.coordinates,
        anchor: "bottom-center",
        content: createMarkerContent(point.name, day.color),
      });
    });
    map.add(markers);
    markersRef.current = markers;
  }, [map, activeDayId]);

  return null;
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMapState] = useState<AMap.Map | null>(null);
  const setStoreMap = useTripStore((state) => state.setMap);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let instance: AMap.Map | null = null;
    let isMounted = true;

    const key = process.env.NEXT_PUBLIC_AMAP_KEY;
    if (!key) {
      setError("AMap key is missing. Set NEXT_PUBLIC_AMAP_KEY in .env");
      return;
    }

    if (typeof window !== "undefined") {
      (window as Window & { _AMapSecurityConfig?: object })._AMapSecurityConfig =
        {
          securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE || "",
        };
    }

    AMapLoader.load({
      key,
      version: "2.0",
      plugins: [],
    })
      .then((AMap) => {
        if (!isMounted || !containerRef.current) return;
        instance = new AMap.Map(containerRef.current, {
          center: MAP_CENTER,
          zoom: MAP_ZOOM,
          viewMode: "2D",
        });
        setMapState(instance);
        setStoreMap(instance);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      isMounted = false;
      if (instance) {
        instance.destroy();
        setMapState(null);
        setStoreMap(null);
      }
    };
  }, [setStoreMap]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-8 text-center text-sm text-muted-foreground">
        Map failed to load: {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {map && (
        <>
          <RoutePolylines map={map} />
          <DayMarkers map={map} />
        </>
      )}
    </div>
  );
}

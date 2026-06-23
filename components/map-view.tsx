"use client";

import AMapLoader from "@amap/amap-jsapi-loader";
import { useEffect, useRef, useState } from "react";
import { trip, type Day } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";

const MAP_CENTER: [number, number] = [87.6168, 43.8256];
const MAP_ZOOM = 6;

function createMarkerContent(
  name: string,
  color: string,
  shape: "circle" | "square",
): string {
  const shapeStyle =
    shape === "circle"
      ? "border-radius:50%;"
      : "border-radius:3px;";
  return `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
      <div style="width:12px;height:12px;${shapeStyle}background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
      <div style="margin-top:3px;background:rgba(255,255,255,0.92);color:#111;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.15);">${name}</div>
    </div>
  `;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function blendColors(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(
    Math.round(ca.r + (cb.r - ca.r) * t),
    Math.round(ca.g + (cb.g - ca.g) * t),
    Math.round(ca.b + (cb.b - ca.b) * t),
  );
}

const GRADIENT_SEGMENTS = 24;

function createGradientPolylines(
  day: Day,
  setActiveDay: (id: string) => void,
  setHoveredDay: (id: string | null) => void,
): AMap.Polyline[] {
  const coords = day.coordinates;
  if (coords.length < 2) return [];

  const startColor = day.startColor;
  const endColor = day.endColor;
  const polylines: AMap.Polyline[] = [];
  const chunk = Math.max(1, Math.ceil(coords.length / GRADIENT_SEGMENTS));

  for (let i = 0; i < coords.length - 1; i += chunk) {
    const segment = coords.slice(i, Math.min(i + chunk + 1, coords.length));
    const t = Math.min(1, (i + chunk / 2) / coords.length);
    const polyline = new AMap.Polyline({
      path: segment,
      strokeColor: blendColors(startColor, endColor, t),
      strokeWeight: 5,
      strokeOpacity: 0.8,
      lineCap: "round",
      lineJoin: "round",
      extData: { dayId: day.id },
      cursor: "pointer",
    });
    polyline.on("mouseover", () => {
      setHoveredDay(day.id);
      setActiveDay(day.id);
    });
    polyline.on("mouseout", () => setHoveredDay(null));
    polylines.push(polyline);
  }
  return polylines;
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
      .flatMap((day) => createGradientPolylines(day, setActiveDay, setHoveredDay));
    map.add(polylines);
    polylinesRef.current = polylines;
    return () => {
      map.remove(polylines);
      polylinesRef.current = [];
    };
  }, [map, setActiveDay, setHoveredDay]);

  useEffect(() => {
    const hasActive = activeDayId !== null;
    polylinesRef.current.forEach((polyline) => {
      const dayId = polyline.getExtData()?.dayId;
      const isActive = dayId === activeDayId;
      const isHovered = dayId === hoveredDayId;
      polyline.setOptions({
        strokeWeight: isActive ? 9 : isHovered ? 7 : 5,
        strokeOpacity: isActive
          ? 1
          : isHovered
            ? 0.85
            : hasActive
              ? 0.25
              : 0.8,
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

    const markers: AMap.Marker[] = [];

    markers.push(
      new AMap.Marker({
        position: day.startCoordinates,
        anchor: "bottom-center",
        content: createMarkerContent(day.start, day.color, "circle"),
      }),
    );

    day.points.forEach((point) => {
      const shape = point.type === "end" ? "square" : "circle";
      markers.push(
        new AMap.Marker({
          position: point.coordinates,
          anchor: "bottom-center",
          content: createMarkerContent(point.name, day.color, shape),
        }),
      );
    });

    map.add(markers);
    markersRef.current = markers;
  }, [map, activeDayId]);

  return null;
}

function CarMarker({ map }: { map: AMap.Map }) {
  const activeDayId = useTripStore((state) => state.activeDayId);
  const hoveredDayId = useTripStore((state) => state.hoveredDayId);
  const markerRef = useRef<AMap.Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const targetId = activeDayId || hoveredDayId;
    const day = targetId ? trip.days.find((d) => d.id === targetId) : null;

    if (!day || day.coordinates.length < 2) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    const path = day.coordinates.map(
      ([lng, lat]) => new AMap.LngLat(lng, lat),
    );

    function haversineKm(a: AMap.LngLat, b: AMap.LngLat): number {
      const R = 6371;
      const toRad = (v: number) => (v * Math.PI) / 180;
      const dLat = toRad(b.getLat() - a.getLat());
      const dLng = toRad(b.getLng() - a.getLng());
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.getLat())) *
          Math.cos(toRad(b.getLat())) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    const cumulativeDistances: number[] = [0];
    for (let i = 1; i < path.length; i++) {
      cumulativeDistances.push(
        cumulativeDistances[i - 1] + haversineKm(path[i - 1], path[i]),
      );
    }

    let cancelled = false;

    const img = new Image();
    img.src = `${window.location.origin}/car.png`;
    img.onload = () => {
      if (cancelled) return;

      const currentDay = day;
      if (!currentDay) return;

      const targetWidth = 28;
      const ratio = img.naturalHeight / img.naturalWidth;
      const targetHeight = Math.max(12, targetWidth * ratio);
      const iconSize = new AMap.Size(targetWidth, targetHeight);
      const icon = new AMap.Icon({
        image: img.src,
        size: iconSize,
        imageSize: iconSize,
      });

      const marker = new AMap.Marker({
        position: path[0],
        icon,
        anchor: "center",
        zIndex: 200,
      });

      map.add(marker);
      markerRef.current = marker;
      startTimeRef.current = performance.now();

      const duration = Math.max(3000, Math.min(7000, day.distanceKm * 25));

      function normalizeAngle(angle: number): number {
        return ((angle % 360) + 360) % 360;
      }

      function lerpAngle(current: number, target: number, factor: number): number {
        const diff = normalizeAngle(target - current + 180) - 180;
        return normalizeAngle(current + diff * factor);
      }

      function headingFromSegments(centerIndex: number): number {
        const total = path.length - 1;
        const radius = 8;
        const startIdx = Math.max(0, centerIndex - radius);
        const endIdx = Math.min(total, centerIndex + radius);

        let sumDx = 0;
        let sumDy = 0;
        for (let i = startIdx; i < endIdx; i++) {
          const c1 = map.lngLatToContainer(path[i]);
          const c2 = map.lngLatToContainer(path[i + 1]);
          sumDx += c2.getX() - c1.getX();
          sumDy += c2.getY() - c1.getY();
        }

        const deg = (Math.atan2(sumDy, sumDx) * 180) / Math.PI;
        // Car image faces left (west). setAngle(0) keeps it facing left,
        // so to make the front point along the path we rotate by (pathAngle - 180).
        return normalizeAngle(deg - 180);
      }

      function positionAt(t: number): {
        position: AMap.LngLat;
        angle: number;
      } {
        const total = path.length - 1;
        const clampedT = Math.max(0, Math.min(1, t));
        const index = Math.min(total - 1, Math.floor(clampedT * total));
        const localT = clampedT * total - index;
        const p1 = path[index];
        const p2 = path[index + 1];
        const lng = p1.getLng() + (p2.getLng() - p1.getLng()) * localT;
        const lat = p1.getLat() + (p2.getLat() - p1.getLat()) * localT;

        const angle = headingFromSegments(index);

        return { position: new AMap.LngLat(lng, lat), angle };
      }

      let currentAngle = headingFromSegments(0);
      let lastProgressUpdate = 0;

      function animate(now: number) {
        const elapsed = now - startTimeRef.current;
        const t = (elapsed % duration) / duration;
        const { position, angle: targetAngle } = positionAt(t);
        currentAngle = lerpAngle(currentAngle, targetAngle, 0.12);
        marker.setPosition(position);
        marker.setAngle(currentAngle);

        if (now - lastProgressUpdate > 150) {
          lastProgressUpdate = now;
          const segmentIndex = Math.min(
            path.length - 2,
            Math.floor(t * (path.length - 1)),
          );
          const localT = t * (path.length - 1) - segmentIndex;
          const d0 = cumulativeDistances[segmentIndex];
          const d1 = cumulativeDistances[segmentIndex + 1];
          const distanceKm = Math.max(
            0,
            Math.min(currentDay.distanceKm, d0 + (d1 - d0) * localT),
          );
          const elapsedMin =
            currentDay.distanceKm > 0
              ? (distanceKm / currentDay.distanceKm) * currentDay.durationMin
              : 0;
          useTripStore.getState().setCarProgress({
            dayId: currentDay.id,
            elapsedMin,
            distanceKm,
          });
        }

        rafRef.current = requestAnimationFrame(animate);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    return () => {
      cancelled = true;
      useTripStore.getState().setCarProgress(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [map, activeDayId, hoveredDayId]);

  return null;
}

function formatElapsedTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

function CarInfoOverlay() {
  const map = useTripStore((state) => state.map);
  const activeDayId = useTripStore((state) => state.activeDayId);
  const hoveredDayId = useTripStore((state) => state.hoveredDayId);
  const carProgress = useTripStore((state) => state.carProgress);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const targetId = activeDayId || hoveredDayId;
  const day = targetId ? trip.days.find((d) => d.id === targetId) : null;

  useEffect(() => {
    if (!map || !day || day.coordinates.length < 2) {
      setScreenPos(null);
      return;
    }

    function updatePosition() {
      if (!map || !day) return;
      const pixel = map.lngLatToContainer(
        new AMap.LngLat(day.startCoordinates[0], day.startCoordinates[1]),
      );
      setScreenPos({ x: pixel.getX(), y: pixel.getY() });
    }

    updatePosition();
    map.on("move", updatePosition);
    map.on("zoom", updatePosition);

    return () => {
      map.off("move", updatePosition);
      map.off("zoom", updatePosition);
    };
  }, [map, day]);

  if (!day || day.coordinates.length < 2 || !screenPos) return null;

  const progress =
    carProgress?.dayId === day.id
      ? carProgress
      : { distanceKm: 0, elapsedMin: 0 };

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-xs shadow-md backdrop-blur-sm"
      style={{
        left: screenPos.x + 12,
        top: screenPos.y - 12,
        transform: "translateY(-100%)",
      }}
    >
      <div className="font-semibold text-foreground">{day.id} 行程进度</div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>已行驶: {progress.distanceKm.toFixed(1)} km</div>
        <div>已用时: {formatElapsedTime(progress.elapsedMin)}</div>
      </div>
    </div>
  );
}

function HelpHint() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-xs shadow-md backdrop-blur-sm">
      <div className="space-y-0.5 text-muted-foreground">
        <div>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">←</kbd>{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">→</kbd>{" "}
          切换日期
        </div>
        <div>Hover / 点击选择路线</div>
      </div>
    </div>
  );
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
      plugins: ["AMap.MoveAnimation"],
    })
      .then((AMap) => {
        if (!isMounted || !containerRef.current) return;
        instance = new AMap.Map(containerRef.current, {
          center: MAP_CENTER,
          zoom: MAP_ZOOM,
          viewMode: "2D",
          mapStyle: "amap://styles/light",
          showScale: false,
          keyboardEnable: false,
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
      <CarInfoOverlay />
      <HelpHint />
      {map && (
        <>
          <RoutePolylines map={map} />
          <DayMarkers map={map} />
          <CarMarker map={map} />
        </>
      )}
    </div>
  );
}

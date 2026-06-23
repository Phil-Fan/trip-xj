"use client";

import { useEffect, useMemo, useRef } from "react";
import { trip, type Day, type Point } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getBasePhotoCount(distanceKm: number): number {
  if (distanceKm < 100) return 2;
  if (distanceKm < 300) return 3;
  if (distanceKm < 500) return 4;
  return 5;
}

// Anchor specific base photos to a named point so they cluster around it.
const BASE_ANCHORS: Record<string, Record<number, string>> = {
  D2: { 2: "天山天池", 3: "天山天池" },
};

interface PhotoConfig {
  position: AMap.LngLat;
  rotation: number;
  scale: number;
  zIndex: number;
  candidates: string[];
  dayId: string;
}

function makeConfig(
  day: Day,
  seedBase: number,
  position: AMap.LngLat,
  candidates: string[],
  zIndex: number,
): PhotoConfig {
  const offsetLng = (pseudoRandom(seedBase) - 0.5) * 0.12;
  const offsetLat = (pseudoRandom(seedBase + 1) - 0.5) * 0.12;
  const rotation = (pseudoRandom(seedBase + 2) - 0.5) * 20;
  const scale = 0.9 + pseudoRandom(seedBase + 3) * 0.2;

  return {
    position: new AMap.LngLat(
      position.getLng() + offsetLng,
      position.getLat() + offsetLat,
    ),
    rotation,
    scale,
    zIndex,
    candidates,
    dayId: day.id,
  };
}

function findPoint(day: Day, name: string): Point | undefined {
  return day.points.find((p) => p.name === name);
}

function getPhotoConfigs(day: Day): PhotoConfig[] {
  if (day.coordinates.length < 2) return [];

  const configs: PhotoConfig[] = [];
  const total = day.coordinates.length;
  const baseCount = getBasePhotoCount(day.distanceKm);

  function photoCandidates(stem: string): string[] {
    return [
      `/photos/${stem}.jpg`,
      `/photos/${stem}.jpeg`,
      `/photos/${stem}.png`,
      `/photos/${stem}.svg`,
    ];
  }

  // Base route accent photos
  for (let i = 0; i < baseCount; i++) {
    const anchorName = BASE_ANCHORS[day.id]?.[i];
    const anchorPoint = anchorName ? findPoint(day, anchorName) : null;

    let position: AMap.LngLat;
    if (anchorPoint) {
      position = new AMap.LngLat(
        anchorPoint.coordinates[0],
        anchorPoint.coordinates[1],
      );
    } else {
      const t = (i + 1) / (baseCount + 1);
      const idx = Math.min(total - 1, Math.floor(t * (total - 1)));
      const [lng, lat] = day.coordinates[idx];
      position = new AMap.LngLat(lng, lat);
    }

    const seedBase = hash(`${day.id}-photo-${i}`);
    configs.push(
      makeConfig(
        day,
        seedBase,
        position,
        photoCandidates(`${day.id}-${i + 1}`),
        50 + i,
      ),
    );
  }

  // Extra photos around scenic/end points
  const interestingPoints = day.points.filter(
    (p): p is Point & { type: "scenic" | "end" } =>
      p.type === "scenic" || p.type === "end",
  );
  interestingPoints.forEach((point, index) => {
    const extraCount = point.name === "夏塔" ? 3 : 1;
    for (let j = 0; j < extraCount; j++) {
      const seedBase = hash(`${day.id}-point-${point.name}-${index}-${j}`);
      configs.push(
        makeConfig(
          day,
          seedBase,
          new AMap.LngLat(point.coordinates[0], point.coordinates[1]),
          photoCandidates(`${day.id}-point-${((index + j) % 5) + 1}`),
          70 + index * 3 + j,
        ),
      );
    }
  });

  return configs;
}

interface PhotoMarkerProps {
  map: AMap.Map;
  config: PhotoConfig;
  visible: boolean;
}

function PhotoMarker({ map, config, visible }: PhotoMarkerProps) {
  const markerRef = useRef<AMap.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resolvedSrcRef = useRef<string>(config.candidates[0] ?? "");

  useEffect(() => {
    const el = document.createElement("div");
    el.className = "polaroid-marker";
    el.innerHTML = `
      <div class="polaroid" style="--rotation:${config.rotation.toFixed(2)}deg;--scale:${config.scale.toFixed(3)};z-index:${config.zIndex}">
        <div class="pin"></div>
        <img src="" alt="" draggable="false" />
      </div>
    `;
    containerRef.current = el;

    const polaroid = el.querySelector(".polaroid") as HTMLElement | null;
    const img = el.querySelector("img") as HTMLImageElement | null;

    if (img) {
      let candidateIndex = 0;
      img.onerror = () => {
        candidateIndex++;
        if (candidateIndex < config.candidates.length) {
          img.src = config.candidates[candidateIndex];
        }
      };
      img.onload = () => {
        resolvedSrcRef.current = img.src;
        if (polaroid && img.naturalWidth && img.naturalHeight) {
          polaroid.classList.toggle(
            "portrait",
            img.naturalHeight > img.naturalWidth,
          );
          polaroid.classList.toggle(
            "landscape",
            img.naturalWidth > img.naturalHeight,
          );
        }
      };
      img.src = config.candidates[0] ?? "";
    }

    if (polaroid) {
      polaroid.addEventListener("click", (e) => {
        e.stopPropagation();
        useTripStore.getState().openPhotoPreview({
          src: resolvedSrcRef.current,
          dayId: config.dayId,
        });
      });
    }

    const marker = new AMap.Marker({
      position: config.position,
      content: el,
      anchor: "bottom-center",
      offset: new AMap.Pixel(0, 0),
      zIndex: config.zIndex,
    });

    marker.setMap(map);
    markerRef.current = marker;

    return () => {
      marker.setMap(null);
      markerRef.current = null;
      containerRef.current = null;
    };
  }, [map, config]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (visible) {
      el.classList.add("visible");
    } else {
      el.classList.remove("visible");
    }
  }, [visible]);

  return null;
}

function DayPhotos({ map, day }: { map: AMap.Map; day: Day }) {
  const activeDayId = useTripStore((state) => state.activeDayId);
  const hoveredDayId = useTripStore((state) => state.hoveredDayId);
  const configs = useMemo(() => getPhotoConfigs(day), [day]);

  const visible = activeDayId === day.id || hoveredDayId === day.id;

  if (configs.length === 0) return null;

  return (
    <>
      {configs.map((config, index) => (
        <PhotoMarker
          key={`${day.id}-photo-${index}`}
          map={map}
          config={config}
          visible={visible}
        />
      ))}
    </>
  );
}

export function RoutePhotos({ map }: { map: AMap.Map }) {
  return (
    <>
      {trip.days
        .filter((day) => day.coordinates.length >= 2)
        .map((day) => (
          <DayPhotos key={day.id} map={map} day={day} />
        ))}
    </>
  );
}

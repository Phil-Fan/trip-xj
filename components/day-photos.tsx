"use client";

import { useEffect, useMemo, useRef } from "react";
import { trip, type Day } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";
import photoManifest from "@/public/photos/photo-manifest.json";

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

type PhotoManifest = Record<string, [number, number]>;

const MANIFEST = photoManifest as unknown as PhotoManifest;

interface PhotoConfig {
  position: AMap.LngLat;
  rotation: number;
  scale: number;
  zIndex: number;
  src: string;
  dayId: string;
}

function makeConfig(
  day: Day,
  seedBase: number,
  position: AMap.LngLat,
  src: string,
  zIndex: number,
): PhotoConfig {
  const rotation = (pseudoRandom(seedBase) - 0.5) * 20;
  const scale = 0.9 + pseudoRandom(seedBase + 1) * 0.2;

  return {
    position,
    rotation,
    scale,
    zIndex,
    src,
    dayId: day.id,
  };
}

function getPhotoConfigs(day: Day): PhotoConfig[] {
  const configs: PhotoConfig[] = [];
  const prefix = `${day.id}-`;
  const entries = Object.entries(MANIFEST)
    .filter(([stem]) => stem.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b));

  entries.forEach(([stem, [lng, lat]], index) => {
    const seedBase = hash(`${day.id}-photo-${stem}`);
    configs.push(
      makeConfig(
        day,
        seedBase,
        new AMap.LngLat(lng, lat),
        `/photos/${stem}.jpeg`,
        50 + index,
      ),
    );
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

  useEffect(() => {
    const el = document.createElement("div");
    el.className = "polaroid-marker";
    el.innerHTML = `
      <div class="polaroid" style="--rotation:${config.rotation.toFixed(2)}deg;--scale:${config.scale.toFixed(3)};z-index:${config.zIndex}">
        <div class="pin"></div>
        <img src="${config.src}" alt="" draggable="false" />
      </div>
    `;
    containerRef.current = el;

    const polaroid = el.querySelector(".polaroid") as HTMLElement | null;
    const img = el.querySelector("img") as HTMLImageElement | null;

    if (img) {
      img.onload = () => {
        if (polaroid && img.naturalHeight > img.naturalWidth) {
          polaroid.classList.add("portrait");
        }
      };
    }

    if (polaroid) {
      polaroid.addEventListener("click", (e) => {
        e.stopPropagation();
        useTripStore.getState().openPhotoPreview({
          src: config.src,
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
  const showAllRoutesAndPhotos = useTripStore(
    (state) => state.showAllRoutesAndPhotos,
  );
  const configs = useMemo(() => getPhotoConfigs(day), [day]);

  const visible =
    showAllRoutesAndPhotos ||
    activeDayId === day.id ||
    hoveredDayId === day.id;

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

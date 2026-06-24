"use client";

import { useEffect, useMemo, useRef } from "react";
import { trip, type Day, type Point } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";
import photoLocations from "@/public/photos/photo-locations.json";

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

// Override the number of base route accent photos for specific days.
const BASE_PHOTO_COUNTS: Record<string, number> = {
  D9: 3,
  D10: 4,
  D11: 5,
  D12: 5,
};

// Override the generated stem for a specific base photo index.
const BASE_PHOTO_STEM_OVERRIDES: Record<string, Record<number, string>> = {
  D12: {
    2: "D12-3",
    3: "D12-4",
    4: "D12-5",
    5: "D12-6",
  },
};

// Anchor specific base photos to a named point or raw coordinates.
type Anchor = string | [number, number];

const BASE_ANCHORS: Record<string, Record<number, Anchor>> = {
  D2: { 1: [87.4, 45.2], 2: "天山天池", 3: "天山天池" },
  D7: { 4: "赛里木湖" },
  D10: { 4: "库尔德宁" },
  D11: {
    1: [82.11, 43.08],
    2: [82.09, 43.07],
    3: [82.07, 43.06],
    4: [82.05, 43.04],
    5: [82.03, 43.02],
  },
  D12: {
    3: "百里画廊",
    4: "独库公路中段",
    5: "独库公路中段",
  },
};

// Extra point photo filenames to place at a specific named point or raw coordinates.
interface ExtraPointPhoto {
  stem: string;
  anchor: Anchor;
}

const EXTRA_POINT_PHOTOS: Record<string, ExtraPointPhoto[]> = {
  D5: [
    { stem: "D5-point-4", anchor: [85.733205, 46.155149] },
    { stem: "D5-point-5", anchor: [84.88, 44.37] },
  ],
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

function findClosestIndex(
  coordinates: [number, number][],
  target: [number, number],
): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  coordinates.forEach(([lng, lat], idx) => {
    const d = (lng - target[0]) ** 2 + (lat - target[1]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

// Days that should not render any photo cards.
const HIDDEN_DAY_PHOTOS = new Set<string>([]);

// Days whose base route accent photos should be skipped.
const SKIP_BASE_PHOTO_DAYS = new Set(["D6"]);

// Restrict base photo placement to a sub-segment of the day's route.
const BASE_PHOTO_SEGMENTS: Record<
  string,
  { from: [number, number]; to: [number, number] }
> = {};

// Point names to skip when generating extra point photos.
const SKIP_POINT_NAMES: Record<string, string[]> = {
  D6: ["乌鲁木齐会展中心"],
  D9: ["新源县"],
  D11: ["喀拉峻"],
};

function getPhotoConfigs(day: Day): PhotoConfig[] {
  if (day.coordinates.length < 2 || HIDDEN_DAY_PHOTOS.has(day.id)) return [];

  const configs: PhotoConfig[] = [];

  const segment = BASE_PHOTO_SEGMENTS[day.id];
  const routeCoords = segment
    ? day.coordinates.slice(
        findClosestIndex(day.coordinates, segment.from),
        findClosestIndex(day.coordinates, segment.to) + 1,
      )
    : day.coordinates;

  const total = routeCoords.length;
  const baseCount = BASE_PHOTO_COUNTS[day.id] ?? getBasePhotoCount(day.distanceKm);

  function photoCandidates(stem: string): string[] {
    return [
      `/photos/${stem}.jpg`,
      `/photos/${stem}.jpeg`,
      `/photos/${stem}.png`,
      `/photos/${stem}.svg`,
    ];
  }

  // Base route accent photos
  if (!SKIP_BASE_PHOTO_DAYS.has(day.id)) {
    for (let i = 0; i < baseCount; i++) {
      const photoKey =
        BASE_PHOTO_STEM_OVERRIDES[day.id]?.[i + 1] ?? `${day.id}-${i + 1}`;
      const realLocation = (
        photoLocations as unknown as Record<string, [number, number]>
      )[photoKey];
      const anchor = BASE_ANCHORS[day.id]?.[i + 1];

      let position: AMap.LngLat;
      if (realLocation) {
        position = new AMap.LngLat(realLocation[0], realLocation[1]);
      } else if (typeof anchor === "string") {
        const anchorPoint = findPoint(day, anchor);
        position = anchorPoint
          ? new AMap.LngLat(
              anchorPoint.coordinates[0],
              anchorPoint.coordinates[1],
            )
          : new AMap.LngLat(day.coordinates[0][0], day.coordinates[0][1]);
      } else if (Array.isArray(anchor)) {
        position = new AMap.LngLat(anchor[0], anchor[1]);
      } else {
        const t = (i + 1) / (baseCount + 1);
        const idx = Math.min(total - 1, Math.floor(t * (total - 1)));
        const [lng, lat] = routeCoords[idx];
        position = new AMap.LngLat(lng, lat);
      }

      const seedBase = hash(`${day.id}-photo-${i}`);
      configs.push(
        makeConfig(
          day,
          seedBase,
          position,
          photoCandidates(photoKey),
          50 + i,
        ),
      );
    }
  }

  // Scenic spots that deserve more than one point photo, optionally with
  // per-photo anchors to spread them around a large area.
  const POINT_PHOTO_OVERRIDES: Record<string, (string | [number, number])[]> = {
    夏塔: [
      [80.665, 42.6],
      [80.668, 42.598],
      [80.671, 42.595],
    ],
    赛里木湖: [
      [81.2, 44.62],
      [81.17, 44.604],
      [81.13, 44.58],
    ],
    薰衣草园: [
      [80.898, 44.278],
      [80.902, 44.28],
      [80.904, 44.274],
    ],
    六星街: [
      [81.308, 43.934],
      [81.31, 43.933],
      [81.312, 43.932],
      [81.311, 43.935],
    ],
    库尔德宁: [
      "库尔德宁",
      [82.75, 43.32],
      [82.85, 43.38],
    ],
  };

  // Extra photos around scenic/end points
  const skippedPointNames = new Set(SKIP_POINT_NAMES[day.id] ?? []);
  const interestingPoints = day.points.filter(
    (p): p is Point & { type: "scenic" | "end" } =>
      (p.type === "scenic" || p.type === "end") && !skippedPointNames.has(p.name),
  );
  let pointPhotoNumber = 1;
  interestingPoints.forEach((point, index) => {
    const anchors = POINT_PHOTO_OVERRIDES[point.name] ?? [point.name];
    anchors.forEach((anchor, j) => {
      let position: AMap.LngLat;
      if (typeof anchor === "string") {
        const anchorPoint = findPoint(day, anchor);
        position = anchorPoint
          ? new AMap.LngLat(anchorPoint.coordinates[0], anchorPoint.coordinates[1])
          : new AMap.LngLat(point.coordinates[0], point.coordinates[1]);
      } else {
        position = new AMap.LngLat(anchor[0], anchor[1]);
      }
      const seedBase = hash(`${day.id}-point-${point.name}-${index}-${j}`);
      configs.push(
        makeConfig(
          day,
          seedBase,
          position,
          photoCandidates(`${day.id}-point-${pointPhotoNumber++}`),
          70 + index * 3 + j,
        ),
      );
    });
  });

  // Additional manual point photo placements
  const manualPhotos = EXTRA_POINT_PHOTOS[day.id];
  if (manualPhotos) {
    manualPhotos.forEach(({ stem, anchor }, overrideIndex) => {
      let position: AMap.LngLat;
      if (typeof anchor === "string") {
        const point = findPoint(day, anchor);
        position = point
          ? new AMap.LngLat(point.coordinates[0], point.coordinates[1])
          : new AMap.LngLat(day.coordinates[0][0], day.coordinates[0][1]);
      } else {
        position = new AMap.LngLat(anchor[0], anchor[1]);
      }
      const seedBase = hash(`${day.id}-point-override-${stem}`);
      configs.push(
        makeConfig(day, seedBase, position, photoCandidates(stem), 85 + overrideIndex),
      );
    });
  }

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
        if (polaroid && img.naturalHeight > img.naturalWidth) {
          polaroid.classList.add("portrait");
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

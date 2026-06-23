import { create } from "zustand";
import { trip } from "@/lib/data/trip";

export interface CarProgress {
  dayId: string;
  elapsedMin: number;
  distanceKm: number;
}

export interface PhotoPreview {
  src: string;
  dayId: string;
}

interface TripState {
  activeDayId: string | null;
  hoveredDayId: string | null;
  selectedRoute: string | null;
  map: AMap.Map | null;
  carProgress: CarProgress | null;
  photoPreview: PhotoPreview | null;
}

interface TripActions {
  setActiveDay: (id: string | null) => void;
  setHoveredDay: (id: string | null) => void;
  setSelectedRoute: (id: string | null) => void;
  setMap: (map: AMap.Map | null) => void;
  setCarProgress: (progress: CarProgress | null) => void;
  openPhotoPreview: (preview: PhotoPreview) => void;
  closePhotoPreview: () => void;
  clearSelection: () => void;
  fitToDay: (id: string) => void;
}

export type TripStore = TripState & TripActions;

export const useTripStore = create<TripStore>((set, get) => ({
  activeDayId: null,
  hoveredDayId: null,
  selectedRoute: null,
  map: null,
  carProgress: null,
  photoPreview: null,

  setActiveDay: (id) => {
    set({ activeDayId: id });
    if (id) {
      get().fitToDay(id);
    }
  },

  setHoveredDay: (id) => {
    set({ hoveredDayId: id });
  },

  setSelectedRoute: (id) => {
    set({ selectedRoute: id });
  },

  setMap: (map) => {
    set({ map });
  },

  setCarProgress: (progress) => {
    set({ carProgress: progress });
  },

  openPhotoPreview: (preview) => {
    set({ photoPreview: preview });
  },

  closePhotoPreview: () => {
    set({ photoPreview: null });
  },

  clearSelection: () => {
    set({
      activeDayId: null,
      hoveredDayId: null,
      selectedRoute: null,
      carProgress: null,
      photoPreview: null,
    });
  },

  fitToDay: (id) => {
    const day = trip.days.find((d) => d.id === id);
    const map = get().map;
    if (!day || !map) return;

    let bounds: [[number, number], [number, number]];
    if (day.coordinates.length > 0) {
      bounds = day.bounds;
    } else if (day.points.length > 0) {
      const lngs = day.points.map((p) => p.coordinates[0]);
      const lats = day.points.map((p) => p.coordinates[1]);
      bounds = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];
    } else {
      return;
    }

    const [[minLng, minLat], [maxLng, maxLat]] = bounds;
    const fitBounds = map.setBounds as (
      bounds: AMap.Bounds,
      immediately?: boolean,
      padding?: [number, number, number, number],
    ) => void;
    try {
      fitBounds(
        new AMap.Bounds(
          new AMap.LngLat(minLng, minLat),
          new AMap.LngLat(maxLng, maxLat),
        ),
        false,
        [80, 80, 80, 80],
      );
    } catch {
      // Map instance may be destroyed or not ready; ignore.
    }
  },
}));

"use client";

import { useEffect, useRef } from "react";
import { trip } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";
import { cn } from "@/lib/utils";
import { Play, Pause } from "lucide-react";

export default function DaySlider() {
  const activeDayId = useTripStore((state) => state.activeDayId);
  const isPlaying = useTripStore((state) => state.isPlaying);
  const setActiveDay = useTripStore((state) => state.setActiveDay);
  const startPlayback = useTripStore((state) => state.startPlayback);
  const stopPlayback = useTripStore((state) => state.stopPlayback);
  const nextPlaybackDay = useTripStore((state) => state.nextPlaybackDay);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-cycle days during playback.
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      nextPlaybackDay();
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, nextPlaybackDay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      stopPlayback();

      const currentIndex = trip.days.findIndex((d) => d.id === activeDayId);
      const nextIndex =
        e.key === "ArrowRight"
          ? currentIndex === -1 || currentIndex === trip.days.length - 1
            ? 0
            : currentIndex + 1
          : currentIndex <= 0
            ? trip.days.length - 1
            : currentIndex - 1;

      setActiveDay(trip.days[nextIndex].id);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDayId, setActiveDay, stopPlayback]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }

    function onTouchEnd(e: TouchEvent) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = startX - endX;
      const dy = startY - endY;
      const dt = Date.now() - startTime;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40 && dt < 500) {
        stopPlayback();
        const currentIndex = trip.days.findIndex((d) => d.id === activeDayId);
        if (dx > 0) {
          const nextIndex =
            currentIndex === trip.days.length - 1 ? 0 : currentIndex + 1;
          setActiveDay(trip.days[nextIndex].id);
        } else {
          const nextIndex =
            currentIndex <= 0 ? trip.days.length - 1 : currentIndex - 1;
          setActiveDay(trip.days[nextIndex].id);
        }
      }
    }

    container.addEventListener("touchstart", onTouchStart);
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [activeDayId, setActiveDay, stopPlayback]);

  return (
    <div
      ref={containerRef}
      className="bg-background border-border flex h-full w-full items-center border-t shadow-lg px-4"
    >
      <button
        onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
        title={isPlaying ? "暂停循环播放" : "顺序循环播放每一天"}
        className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
      </button>
      <div className="flex w-full items-center">
        {trip.days.map((day) => {
          const isActive = activeDayId === day.id;
          return (
            <button
              key={day.id}
              title={day.title}
              onMouseEnter={() => {
                if (!isPlaying) setActiveDay(day.id);
              }}
              onClick={() => {
                stopPlayback();
                setActiveDay(day.id);
              }}
              className="group relative z-10 flex flex-1 flex-col items-center gap-1.5 rounded-md py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative flex h-5 w-full items-center justify-center">
                <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-border" />
                <div
                  className={cn(
                    "relative z-10 w-1.5 rounded-sm border-2 transition-all duration-200",
                    isActive
                      ? "h-5 border-foreground bg-foreground shadow-sm"
                      : "h-2.5 border-muted-foreground/50 bg-background group-hover:h-3.5",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive
                    ? "font-bold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {day.id}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

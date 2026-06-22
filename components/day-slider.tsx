"use client";

import { useEffect } from "react";
import { trip } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";
import { cn } from "@/lib/utils";

export default function DaySlider() {
  const activeDayId = useTripStore((state) => state.activeDayId);
  const setActiveDay = useTripStore((state) => state.setActiveDay);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();

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
  }, [activeDayId, setActiveDay]);

  return (
    <div className="bg-background border-border flex h-full w-full items-center border-t shadow-lg px-4">
      <div className="flex w-full items-center">
        {trip.days.map((day) => {
          const isActive = activeDayId === day.id;
          return (
            <button
              key={day.id}
              title={day.title}
              onMouseEnter={() => setActiveDay(day.id)}
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

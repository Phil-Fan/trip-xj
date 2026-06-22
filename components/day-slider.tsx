"use client";

import { trip } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";
import { cn } from "@/lib/utils";

export default function DaySlider() {
  const activeDayId = useTripStore((state) => state.activeDayId);
  const setActiveDay = useTripStore((state) => state.setActiveDay);

  return (
    <div className="bg-background border-border relative flex h-full w-full items-center border-t shadow-lg">
      <div className="absolute top-1/2 right-4 left-4 h-0.5 -translate-y-1/2 bg-muted" />
      <div className="relative z-10 flex w-full items-center px-4">
        {trip.days.map((day) => {
          const isActive = activeDayId === day.id;
          return (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              className="group flex flex-1 flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md py-2"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-200",
                  isActive
                    ? "scale-110 text-white shadow-md"
                    : "bg-background text-foreground hover:scale-105",
                )}
                style={{
                  borderColor: day.color,
                  backgroundColor: isActive ? day.color : undefined,
                  color: isActive ? "white" : day.color,
                }}
              >
                {day.id.replace("D", "")}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
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

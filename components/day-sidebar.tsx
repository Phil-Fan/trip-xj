"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trip } from "@/lib/data/trip";
import { useTripStore } from "@/lib/store/trip-store";
import { cn } from "@/lib/utils";
import { ArrowRight, Car, MapPin, PanelRightClose, PanelRightOpen } from "lucide-react";

export default function DaySidebar() {
  const [open, setOpen] = useState(true);
  const activeDayId = useTripStore((state) => state.activeDayId);
  const hoveredDayId = useTripStore((state) => state.hoveredDayId);
  const setActiveDay = useTripStore((state) => state.setActiveDay);
  const setHoveredDay = useTripStore((state) => state.setHoveredDay);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (activeDayId && itemRefs.current[activeDayId]) {
      itemRefs.current[activeDayId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeDayId]);

  return (
    <>
      {!open && (
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setOpen(true)}
          className="absolute top-3 right-3 z-20 h-10 w-10 rounded-full shadow-md"
          aria-label="Open sidebar"
        >
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      )}
      <aside
        className={cn(
          "bg-background border-border flex h-full shrink-0 flex-col border-l shadow-xl transition-all duration-300",
          open ? "w-80 sm:w-96" : "w-0 overflow-hidden",
        )}
      >
        <div className="border-border flex items-center justify-between border-b p-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              {trip.title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label="Close sidebar"
          >
            <PanelRightClose className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-3">
            {trip.days.map((day) => {
              const isActive = activeDayId === day.id;
              const isHovered = hoveredDayId === day.id;
              return (
                <button
                  key={day.id}
                  ref={(el) => {
                    itemRefs.current[day.id] = el;
                  }}
                  onClick={() => setActiveDay(day.id)}
                  onMouseEnter={() => setHoveredDay(day.id)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={cn(
                    "text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl",
                    isActive && "scale-[1.02]",
                  )}
                >
                  <Card
                    className={cn(
                      "border transition-colors duration-200",
                      isActive
                        ? "bg-card shadow-md"
                        : isHovered
                          ? "bg-accent/60 shadow-sm"
                          : "bg-card/60 hover:bg-accent/40",
                      activeDayId && !isActive && "opacity-60",
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                          style={{ backgroundColor: day.color }}
                        >
                          {day.id}
                        </span>
                        <CardTitle className="text-base leading-tight">
                          {day.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{day.start}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{day.end}</span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Car className="h-3.5 w-3.5" />
                        <span>约 {day.distanceKm} km</span>
                      </div>
                      <Separator />
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {day.routeSummary}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}

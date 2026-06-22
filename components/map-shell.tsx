"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map-view"), { ssr: false });

export default function MapShell() {
  return (
    <div className="relative h-full w-full">
      <MapView />
    </div>
  );
}

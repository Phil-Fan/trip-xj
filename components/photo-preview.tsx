"use client";

import { useEffect } from "react";
import { useTripStore } from "@/lib/store/trip-store";
import { X } from "lucide-react";

export function PhotoPreview() {
  const preview = useTripStore((state) => state.photoPreview);
  const closePhotoPreview = useTripStore((state) => state.closePhotoPreview);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closePhotoPreview();
      }
    }

    if (preview) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [preview, closePhotoPreview]);

  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={closePhotoPreview}
    >
      <button
        onClick={closePhotoPreview}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg bg-white p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={preview.src}
          alt={`${preview.dayId} photo`}
          className="max-h-[80vh] max-w-[85vw] object-contain"
        />
      </div>
    </div>
  );
}

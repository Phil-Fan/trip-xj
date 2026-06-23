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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      onClick={closePhotoPreview}
    >
      <div
        className="relative rounded-sm bg-[#fdfbf7] p-3 pb-10 shadow-2xl"
        style={{
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.15), 0 24px 48px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closePhotoPreview}
          className="absolute -top-3 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-foreground shadow-md transition-colors hover:bg-muted"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={preview.src}
          alt={`${preview.dayId} photo`}
          className="max-h-[70vh] max-w-[70vw] object-contain"
        />
      </div>
    </div>
  );
}

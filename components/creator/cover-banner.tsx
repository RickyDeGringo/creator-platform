"use client";

import { useState } from "react";
import type { PostImage } from "@/lib/types";

export function CoverBanner({ images }: { images: PostImage[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return (
      <div className="h-64 bg-[radial-gradient(circle_at_top_left,oklch(0.55_0.16_40),transparent_42%),linear-gradient(160deg,oklch(0.28_0.03_70),oklch(0.16_0.012_65))] sm:h-80" />
    );
  }

  return (
    <div className="relative h-64 bg-muted sm:h-80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt=""
        width={current.width ?? undefined}
        height={current.height ?? undefined}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
      {images.length > 1 ? (
        <>
          <div className="absolute inset-y-0 left-0 flex items-center px-2">
            <button
              type="button"
              aria-label="Previous cover"
              className="rounded-full bg-background/80 px-3 py-1 text-sm"
              onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}
            >
              Previous
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center px-2">
            <button
              type="button"
              aria-label="Next cover"
              className="rounded-full bg-background/80 px-3 py-1 text-sm"
              onClick={() => setIndex((value) => (value + 1) % images.length)}
            >
              Next
            </button>
          </div>
          <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((image, dot) => (
              <button
                key={image.url}
                type="button"
                aria-label={`Cover ${dot + 1}`}
                aria-current={dot === index ? "true" : undefined}
                className={dot === index ? "h-1.5 w-3 rounded-full bg-foreground" : "size-1.5 rounded-full bg-foreground/35"}
                onClick={() => setIndex(dot)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

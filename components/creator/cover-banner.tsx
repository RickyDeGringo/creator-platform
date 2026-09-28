"use client";

import { useState } from "react";
import type { PostImage } from "@/lib/types";

export function CoverBanner({ images }: { images: PostImage[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return (
      <div className="cover-fallback h-64 sm:h-80" />
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
          <div className="absolute inset-y-0 left-0 flex items-center px-3">
            <button
              type="button"
              aria-label="Previous cover"
              className="inline-flex size-11 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm"
              onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}
            >
              <Chevron direction="left" />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center px-3">
            <button
              type="button"
              aria-label="Next cover"
              className="inline-flex size-11 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm"
              onClick={() => setIndex((value) => (value + 1) % images.length)}
            >
              <Chevron direction="right" />
            </button>
          </div>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2">
            {images.map((image, dot) => (
              <button
                key={image.url}
                type="button"
                aria-label={`Cover ${dot + 1}`}
                aria-current={dot === index ? "true" : undefined}
                className="inline-flex size-11 items-center justify-center"
                onClick={() => setIndex(dot)}
              >
                <span
                  className={dot === index ? "h-1.5 w-3 rounded-full bg-foreground" : "size-1.5 rounded-full bg-foreground/35"}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? <path d="M15 18 9 12l6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

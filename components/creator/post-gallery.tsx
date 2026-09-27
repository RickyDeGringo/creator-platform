"use client";

import { useEffect, useRef, useState } from "react";
import type { PostImage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostGallery({
  images,
  alt,
  priority = false,
}: {
  images: PostImage[];
  alt: string;
  priority?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = images.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex == null) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
  }, [openIndex]);

  if (count === 0) return null;

  function openAt(index: number) {
    setOpenIndex(index);
  }

  function step(delta: number) {
    setOpenIndex((current) => {
      if (current == null) return current;
      return Math.max(0, Math.min(count - 1, current + delta));
    });
  }

  const active = openIndex == null ? null : images[openIndex];

  return (
    <>
      {count === 1 ? (
        <PlateButton image={images[0]} alt={alt} priority={priority} onOpen={() => openAt(0)} solo />
      ) : (
        <div
          className={cn(
            "grid gap-px overflow-hidden rounded-2xl bg-foreground/12",
            count === 5 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2",
          )}
        >
          {images.map((image, index) => (
            <PlateButton
              key={`${image.url}-${index}`}
              image={image}
              alt={`${alt} (${index + 1} of ${count})`}
              priority={priority && index === 0}
              onOpen={() => openAt(index)}
              className={plateCell(count, index)}
            />
          ))}
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-label="Photo"
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-background/95 p-0 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-md"
        onClose={() => setOpenIndex(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(-1);
          }
        }}
      >
        {active && openIndex != null ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <p className="text-xs tracking-[0.28em] text-muted-foreground uppercase">
                {label(openIndex + 1)} / {label(count)}
              </p>
              <button
                type="button"
                className="inline-flex min-h-11 items-center px-2 text-sm tracking-wide text-foreground"
                onClick={() => dialogRef.current?.close()}
              >
                Close
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 sm:px-10">
              <Photo
                image={active}
                alt={`${alt} (${openIndex + 1} of ${count})`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            {count > 1 ? (
              <div className="flex items-center justify-center gap-8 px-4 py-4">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center px-2 text-sm tracking-wide text-muted-foreground disabled:opacity-30"
                  disabled={openIndex === 0}
                  onClick={() => step(-1)}
                >
                  Previous
                </button>
                <div className="flex">
                  {images.map((image, index) => (
                    <button
                      key={`${image.url}-viewer-${index}`}
                      type="button"
                      aria-label={`Photo ${index + 1}`}
                      aria-current={index === openIndex ? "true" : undefined}
                      className="inline-flex size-11 items-center justify-center"
                      onClick={() => setOpenIndex(index)}
                    >
                      <span
                        className={
                          index === openIndex ? "h-1.5 w-3 rounded-full bg-foreground" : "size-1.5 rounded-full bg-foreground/35"
                        }
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center px-2 text-sm tracking-wide text-muted-foreground disabled:opacity-30"
                  disabled={openIndex === count - 1}
                  onClick={() => step(1)}
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function plateCell(count: number, index: number) {
  if (count === 3 && index === 0) return "col-span-2 aspect-[3/2]";
  if (count === 5 && index === 0) return "col-span-2 aspect-[3/2] sm:row-span-2 sm:aspect-auto";
  if (count === 5) return "aspect-square sm:aspect-[3/2]";
  return "aspect-[3/2]";
}

function label(value: number) {
  return String(value).padStart(2, "0");
}

function PlateButton({
  image,
  alt,
  priority,
  onOpen,
  solo = false,
  className,
}: {
  image: PostImage;
  alt: string;
  priority: boolean;
  onOpen: () => void;
  solo?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative block cursor-zoom-in overflow-hidden bg-background outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        solo && "w-full rounded-2xl",
        className,
      )}
    >
      <Photo
        image={image}
        alt={alt}
        priority={priority}
        className={
          solo
            ? "mx-auto block h-auto max-h-[min(72svh,38rem)] w-full object-contain"
            : "absolute inset-0 size-full object-cover transition duration-700 motion-safe:group-hover:scale-[1.03]"
        }
      />
    </button>
  );
}

function Photo({
  image,
  alt,
  priority = false,
  className,
}: {
  image: PostImage;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    // Photos are already resized to WebP. Serving them directly avoids a second optimization hop.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
      className={className}
    />
  );
}

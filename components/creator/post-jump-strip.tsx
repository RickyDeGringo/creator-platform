"use client";

import { useEffect } from "react";
import { LockIcon } from "@/components/creator/lock-icon";
import type { FeedPost, PostImage } from "@/lib/types";

export function PostJumpStrip({ posts }: { posts: FeedPost[] }) {
  useEffect(() => {
    const header = document.querySelector("header");
    const apply = () => {
      const height = header?.getBoundingClientRect().height ?? 64;
      document.documentElement.style.setProperty("--creator-stick", `${Math.ceil(height)}px`);
    };
    apply();
    if (!header) return;
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const items = posts.flatMap((post) => {
    const tiles = tilesFor(post);
    return tiles.map((tile, index) => ({
      key: `${post.id}:${index}`,
      postId: post.id,
      locked: post.is_locked,
      image: tile.image,
      label: labelFor(post, tile.image, index, tiles.length),
    }));
  });

  if (items.length === 0) return null;

  return (
    <nav aria-label="Post photos" className="sticky top-(--creator-stick) z-30 -mx-4 border-b border-foreground/10 bg-background/90 px-4 py-2 backdrop-blur-md">
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              document.getElementById(`post-${item.postId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image.url}
                alt=""
                width={item.image.width ?? undefined}
                height={item.image.height ?? undefined}
                loading={index < 8 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className={
                  item.locked
                    ? "size-full scale-110 object-cover blur-md"
                    : "size-full object-cover"
                }
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-0 scale-125 blur-md"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 30%, oklch(0.7 0.1 45), transparent 38%), radial-gradient(circle at 72% 70%, oklch(0.38 0.05 30), transparent 42%), linear-gradient(160deg, oklch(0.48 0.05 55), oklch(0.22 0.02 40))",
                }}
              />
            )}
            {item.locked ? (
              <span className="absolute inset-0 flex items-center justify-center bg-background/40 text-foreground">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-background/85 shadow-sm">
                  <LockIcon />
                </span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

function labelFor(post: FeedPost, image: PostImage | null, index: number, count: number) {
  if (post.is_locked) {
    return image || (post.image_count ?? 0) > 0 ? "Paywalled photo, jump to post" : "Paywalled post, jump to post";
  }
  return count > 1 ? `Jump to photo ${index + 1}` : "Jump to photo";
}

function tilesFor(post: FeedPost): { image: PostImage | null }[] {
  if (!post.is_locked) return post.images.map((image) => ({ image }));
  if (post.images.length > 0) return post.images.map((image) => ({ image }));
  const count = post.image_count == null ? 1 : post.image_count;
  return Array.from({ length: count }, () => ({ image: null }));
}


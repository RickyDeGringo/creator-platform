"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreatorAvatar } from "@/components/creator/creator-avatar";
import { SeenPosts } from "@/components/home/seen-posts";
import type { FollowedCreator } from "@/lib/types";
import type { ReactNode } from "react";

export function FollowingHome({
  creators,
  children,
}: {
  creators: FollowedCreator[];
  children: ReactNode;
}) {
  const [counts, setCounts] = useState(() => new Map(creators.map((creator) => [creator.id, creator.unseenCount])));

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

  return (
    <SeenPosts
      onSeen={(pageId) => {
        setCounts((current) => {
          const next = new Map(current);
          next.set(pageId, Math.max(0, (next.get(pageId) ?? 0) - 1));
          return next;
        });
      }}
    >
      <nav
        aria-label="Creators you follow"
        className="sticky top-(--creator-stick) z-40 -mx-4 border-b border-foreground/10 bg-background/90 px-4 py-3 backdrop-blur-md"
      >
        <div className="flex gap-3 overflow-x-auto px-1 pt-2 pb-1">
          {creators.map((creator) => {
            const count = counts.get(creator.id) ?? 0;
            const href = `/${creator.slug}`;
            const label =
              count === 1
                ? `${creator.displayName}, 1 new post, open creator page`
                : count > 0
                  ? `${creator.displayName}, ${count} new posts, open creator page`
                  : `${creator.displayName}, open creator page`;
            return (
              <Link
                key={creator.id}
                href={href}
                aria-label={label}
                title={creator.displayName}
                className="relative block size-14 shrink-0 touch-manipulation rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CreatorAvatar name={creator.displayName} url={creator.avatarUrl} className="size-full" />
                {count > 0 ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-1.5 -right-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white tabular-nums ring-2 ring-background"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="mt-6">{children}</div>
    </SeenPosts>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { markPostsSeen } from "@/app/actions/seen";

const counted = new Set<string>();

export function SeenPosts({
  enabled = true,
  onSeen,
  children,
}: {
  enabled?: boolean;
  onSeen?: (pageId: string) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onSeenRef = useRef(onSeen);

  useEffect(() => {
    onSeenRef.current = onSeen;
  }, [onSeen]);

  useEffect(() => {
    if (!enabled) return;
    const root = ref.current;
    if (!root) return;

    const pending = new Map<string, { pageId: string; unseen: boolean }>();
    let timer = 0;
    let closed = false;

    const flush = () => {
      const batch = [...pending.entries()];
      pending.clear();
      if (batch.length === 0) return;
      const ids = batch.map(([postId]) => postId);
      void markPostsSeen(ids).then((result) => {
        if (!result.ok || closed) return;
        for (const [postId, item] of batch) {
          if (counted.has(postId)) continue;
          counted.add(postId);
          if (item.unseen) onSeenRef.current?.(item.pageId);
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const postId = el.dataset.seenPost;
          const pageId = el.dataset.seenPage;
          if (!postId || !pageId || counted.has(postId) || pending.has(postId)) continue;
          pending.set(postId, { pageId, unseen: el.dataset.unseen === "1" });
          observer.unobserve(el);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(flush, 350);
      },
      { threshold: 0.45 },
    );

    for (const el of root.querySelectorAll<HTMLElement>("[data-seen-post]")) {
      observer.observe(el);
    }

    return () => {
      closed = true;
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return <div ref={ref}>{children}</div>;
}

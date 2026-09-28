"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "posts", label: "Posts" },
  { id: "wishlist", label: "Wishlist" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CreatorTabs({
  wishlist,
  posts,
}: {
  wishlist: React.ReactNode;
  posts: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("posts");

  function move(current: TabId, key: string) {
    if (key !== "ArrowRight" && key !== "ArrowLeft") return;
    const index = tabs.findIndex((item) => item.id === current);
    const delta = key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  return (
    <div className="mt-12">
      <div role="tablist" aria-label="Creator page" className="flex gap-6 border-b border-foreground/10">
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                move(item.id, event.key);
              }}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 px-1 font-heading text-3xl transition-colors",
                selected
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="panel-posts" aria-labelledby="tab-posts" hidden={tab !== "posts"} className="mt-6">
        {posts}
      </div>
      <div
        role="tabpanel"
        id="panel-wishlist"
        aria-labelledby="tab-wishlist"
        hidden={tab !== "wishlist"}
        className="mt-6"
      >
        {wishlist}
      </div>
    </div>
  );
}

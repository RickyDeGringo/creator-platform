"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "details", label: "Details" },
  { id: "design", label: "Design" },
  { id: "posts", label: "Posts" },
  { id: "wishlist", label: "Wishlist" },
  { id: "managers", label: "Managers" },
  { id: "access", label: "Access" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function DashboardTabs({
  details,
  design,
  posts,
  wishlist,
  managers,
  access,
}: {
  details: React.ReactNode;
  design: React.ReactNode;
  posts: React.ReactNode;
  wishlist: React.ReactNode;
  managers: React.ReactNode;
  access: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("details");
  const panels: Record<TabId, React.ReactNode> = { details, design, posts, wishlist, managers, access };

  function select(id: TabId) {
    setTab(id);
    const list = document.getElementById("manage-tablist");
    if (!list) return;
    const top = list.getBoundingClientRect().top;
    if (top < 64) {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - 64) });
    }
  }

  function move(current: TabId, key: string) {
    if (key !== "ArrowRight" && key !== "ArrowLeft") return;
    const index = tabs.findIndex((item) => item.id === current);
    const nextIndex = key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    const next = tabs[nextIndex].id;
    select(next);
    document.getElementById(`manage-tab-${next}`)?.focus();
  }

  return (
    <div className="mt-8">
      <div
        id="manage-tablist"
        role="tablist"
        aria-label="Page management"
        className="flex flex-wrap gap-x-3 gap-y-1 border-b border-foreground/10"
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`manage-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`manage-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                move(item.id, event.key);
              }}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 px-1 font-heading text-2xl transition-colors sm:text-3xl",
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
      {tabs.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`manage-panel-${item.id}`}
          aria-labelledby={`manage-tab-${item.id}`}
          hidden={tab !== item.id}
          className="mt-6"
        >
          {panels[item.id]}
        </div>
      ))}
    </div>
  );
}

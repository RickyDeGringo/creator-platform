"use client";

import { useRef, useState } from "react";
import { tagPillClass } from "@/components/wishlist-tags";
import { cn } from "@/lib/utils";
import type { Goal, WishlistCategory } from "@/lib/types";

const MAX_ITEMS = 6;

type Item = Pick<Goal, "id" | "title" | "category_ids"> & { image_url?: string | null };
type Category = Pick<WishlistCategory, "id" | "name">;

export function WishlistItemPicker({
  goals,
  categories,
  selectedIds = [],
  revision = null,
}: {
  goals: Item[];
  categories: Category[];
  selectedIds?: string[];
  revision?: { success?: string } | null;
}) {
  const [selected, setSelected] = useState(selectedIds);
  const seenRevision = useRef(revision);
  if (revision !== seenRevision.current) {
    seenRevision.current = revision;
    if (revision?.success) setSelected([]);
  }

  const [tagId, setTagId] = useState("all");
  const full = selected.length >= MAX_ITEMS;
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const visible = goals
    .filter((goal) => {
      const tagged = goal.category_ids.some((id) => names.has(id));
      if (tagId === "all") return true;
      if (tagId === "none") return !tagged;
      return goal.category_ids.includes(tagId);
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  const hasUntagged = goals.some((goal) => !goal.category_ids.some((id) => names.has(id)));

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      if (!checked) return current.filter((item) => item !== id);
      if (current.includes(id) || current.length >= MAX_ITEMS) return current;
      return [...current, id];
    });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Attach wishlist items</legend>
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add wishlist items first, then attach them to this post.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Tap a thumbnail to attach it. Up to {MAX_ITEMS}.</p>
          {categories.length > 0 ? (
            <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={tagId === "all"}
                onClick={() => setTagId("all")}
                className={tagPillClass(tagId === "all")}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={tagId === category.id}
                  onClick={() => setTagId(category.id)}
                  className={tagPillClass(tagId === category.id)}
                >
                  {category.name}
                </button>
              ))}
              {hasUntagged ? (
                <button
                  type="button"
                  aria-pressed={tagId === "none"}
                  onClick={() => setTagId("none")}
                  className={tagPillClass(tagId === "none")}
                >
                  Untagged
                </button>
              ) : null}
            </div>
          ) : null}
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items with that tag.</p>
          ) : (
            <ul className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {visible.map((goal) => {
                const checked = selected.includes(goal.id);
                return (
                  <li key={goal.id}>
                    <label
                      className={cn(
                        "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10",
                        "has-[:checked]:ring-2 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        !checked && full && "cursor-not-allowed opacity-40",
                      )}
                    >
                      <input
                        type="checkbox"
                        name="goal_ids"
                        value={goal.id}
                        className="sr-only"
                        checked={checked}
                        disabled={!checked && full}
                        onChange={(event) => toggle(goal.id, event.target.checked)}
                      />
                      {goal.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={goal.image_url} alt="" className="aspect-square w-full bg-background object-cover" />
                      ) : (
                        <span className="flex aspect-square w-full items-center justify-center bg-background/40 font-heading text-2xl text-muted-foreground">
                          {goal.title.slice(0, 1)}
                        </span>
                      )}
                      <span className="truncate px-2 py-1.5 text-xs font-medium">{goal.title}</span>
                      <span
                        aria-hidden
                        className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 group-has-[:checked]:opacity-100"
                      >
                        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {selected.length} of {MAX_ITEMS} selected.
          </p>
        </>
      )}
    </fieldset>
  );
}

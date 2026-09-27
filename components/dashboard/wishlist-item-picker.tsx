"use client";

import { useRef, useState } from "react";
import { tagPillClass } from "@/components/wishlist-tags";
import type { Goal, WishlistCategory } from "@/lib/types";

const MAX_ITEMS = 6;

type Item = Pick<Goal, "id" | "title" | "category_ids">;
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
        <p className="text-sm text-muted-foreground">Add wishlist items first, then pin individual ones to this post.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Choose items one by one. Up to {MAX_ITEMS}.</p>
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
          <div className="grid max-h-80 gap-2 overflow-y-auto rounded-xl bg-muted/50 p-3">
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items with that tag.</p>
            ) : (
              visible.map((goal) => {
                const checked = selected.includes(goal.id);
                const tags = goal.category_ids.flatMap((id) => {
                  const name = names.get(id);
                  return name ? [{ id, name }] : [];
                });
                return (
                  <label key={goal.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="goal_ids"
                      value={goal.id}
                      className="size-4"
                      checked={checked}
                      disabled={!checked && full}
                      onChange={(event) => toggle(goal.id, event.target.checked)}
                    />
                    <span className="min-w-0 truncate">{goal.title}</span>
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground/70"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.length} of {MAX_ITEMS} selected.
          </p>
        </>
      )}
    </fieldset>
  );
}

"use client";

import { useRef, useState } from "react";
import type { Goal, WishlistCategory } from "@/lib/types";

const MAX_ITEMS = 6;

type Item = Pick<Goal, "id" | "title" | "category_id">;
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

  const full = selected.length >= MAX_ITEMS;
  const sections = groupItems(goals, categories);

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
          <p className="text-sm text-muted-foreground">
            Choose items one by one. A category is only a heading. Up to {MAX_ITEMS}.
          </p>
          <div className="grid max-h-80 gap-4 overflow-y-auto rounded-xl bg-muted/50 p-3">
            {sections.map((section) => (
              <div key={section.id} className="grid gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{section.name}</p>
                {section.items.map((goal) => {
                  const checked = selected.includes(goal.id);
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
                      <span className="truncate">{goal.title}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.length} of {MAX_ITEMS} selected.
          </p>
        </>
      )}
    </fieldset>
  );
}

function groupItems(goals: Item[], categories: Category[]) {
  const byTitle = (a: Item, b: Item) => a.title.localeCompare(b.title);
  const known = new Set(categories.map((category) => category.id));
  const sections = [...categories]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: goals.filter((goal) => goal.category_id === category.id).sort(byTitle),
    }))
    .filter((section) => section.items.length > 0);
  const loose = goals.filter((goal) => !goal.category_id || !known.has(goal.category_id)).sort(byTitle);
  if (loose.length > 0) sections.push({ id: "none", name: "No category", items: loose });
  return sections;
}

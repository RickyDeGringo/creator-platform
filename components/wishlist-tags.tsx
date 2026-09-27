"use client";

import { useRef, useState } from "react";
import { cn } from "cn";
import { MAX_GOAL_TAGS } from "@/lib/validators";

export function tagPillClass(selected: boolean, disabled = false) {
  return cn(
    "inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
    selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70 hover:bg-muted/80",
    disabled ? "cursor-not-allowed opacity-40 hover:bg-muted" : "cursor-pointer",
  );
}

export function WishlistTagField({
  categories,
  selectedIds = [],
  revision = null,
}: {
  categories: { id: string; name: string }[];
  selectedIds?: string[];
  revision?: { success?: string } | null;
}) {
  const [selected, setSelected] = useState(selectedIds);
  const seenRevision = useRef(revision);
  if (revision !== seenRevision.current) {
    seenRevision.current = revision;
    if (revision?.success) setSelected([]);
  }

  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">Add tags above, then tap them onto a goal.</p>;
  }

  const full = selected.length >= MAX_GOAL_TAGS;

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      if (!checked) return current.filter((item) => item !== id);
      if (current.includes(id) || current.length >= MAX_GOAL_TAGS) return current;
      return [...current, id];
    });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Tags</legend>
      <p className="text-sm text-muted-foreground">Tap to add more than one. Up to {MAX_GOAL_TAGS}.</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const on = selected.includes(category.id);
          const disabled = !on && full;
          return (
            <label
              key={category.id}
              className={cn(tagPillClass(on, disabled), "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2")}
            >
              <input
                type="checkbox"
                name="category_ids"
                value={category.id}
                className="sr-only"
                checked={on}
                disabled={disabled}
                onChange={(event) => toggle(category.id, event.target.checked)}
              />
              {category.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

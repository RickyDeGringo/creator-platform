"use client";

import { useMemo, useState } from "react";
import { GoalList } from "@/components/creator/goal-list";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asNumber, progressPercent } from "@/lib/format";
import type { Goal, WishlistCategory } from "@/lib/types";

const sorts = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "title-asc", label: "Title A–Z" },
  { id: "title-desc", label: "Title Z–A" },
  { id: "progress", label: "Closest to funded" },
  { id: "remaining", label: "Most left to raise" },
  { id: "target", label: "Highest target" },
] as const;

type SortId = (typeof sorts)[number]["id"];

function remaining(goal: Goal) {
  return Math.max(0, asNumber(goal.target_amount) - asNumber(goal.current_amount_raised));
}

function sortGoals(goals: Goal[], sort: SortId) {
  return [...goals].sort((a, b) => {
    if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
    if (sort === "title-asc") return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    if (sort === "title-desc") return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
    if (sort === "progress") {
      return (
        progressPercent(b.current_amount_raised, b.target_amount) -
        progressPercent(a.current_amount_raised, a.target_amount)
      );
    }
    if (sort === "remaining") return remaining(b) - remaining(a);
    if (sort === "target") return asNumber(b.target_amount) - asNumber(a.target_amount);
    return b.created_at.localeCompare(a.created_at);
  });
}

export function WishlistBoard({
  goals,
  categories,
  paypalLink,
}: {
  goals: Goal[];
  categories: WishlistCategory[];
  paypalLink: string | null;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("newest");
  const [categoryId, setCategoryId] = useState("all");

  const names = useMemo(() => {
    const map: Record<string, string> = {};
    for (const category of categories) map[category.id] = category.name;
    return map;
  }, [categories]);

  const hasUncategorized = goals.some((goal) => !goal.category_id || !names[goal.category_id]);
  const showCategories = categories.length > 0;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = goals.filter((goal) => {
      const category = goal.category_id ? names[goal.category_id] : undefined;
      if (categoryId === "none" && category) return false;
      if (categoryId !== "all" && categoryId !== "none" && goal.category_id !== categoryId) return false;
      if (!needle) return true;
      return (
        goal.title.toLowerCase().includes(needle) || (goal.description ?? "").toLowerCase().includes(needle)
      );
    });
    return sortGoals(matched, sort);
  }, [categoryId, goals, names, query, sort]);

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the wishlist yet.</p>;
  }

  const empty =
    categoryId !== "all" && !query.trim()
      ? "Nothing in this category yet."
      : "Nothing matches that search.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search wishlist"
          aria-label="Search wishlist"
          autoComplete="off"
          className="h-10 sm:flex-1"
        />
        <select
          aria-label="Sort wishlist"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortId)}
          className="h-10 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground sm:w-52"
        >
          {sorts.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showCategories ? (
        <div role="group" aria-label="Categories" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={categoryId === "all"}
            onClick={() => setCategoryId("all")}
            className={buttonVariants({ variant: categoryId === "all" ? "default" : "outline", size: "sm" })}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={buttonVariants({
                variant: categoryId === category.id ? "default" : "outline",
                size: "sm",
              })}
            >
              {category.name}
            </button>
          ))}
          {hasUncategorized ? (
            <button
              type="button"
              aria-pressed={categoryId === "none"}
              onClick={() => setCategoryId("none")}
              className={buttonVariants({ variant: categoryId === "none" ? "default" : "outline", size: "sm" })}
            >
              Uncategorized
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {visible.length === goals.length
          ? `${goals.length} ${goals.length === 1 ? "item" : "items"}`
          : `${visible.length} of ${goals.length}`}
      </p>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <GoalList goals={visible} paypalLink={paypalLink} categoryNames={categoryId === "all" ? names : undefined} />
      )}
    </div>
  );
}

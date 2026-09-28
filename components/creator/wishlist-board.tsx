"use client";

import { useMemo, useState } from "react";
import { GoalList } from "@/components/creator/goal-list";
import { tagPillClass } from "@/components/wishlist-tags";
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

const valueBands = [
  { id: "under-10", label: "Under $10", match: (amount: number) => amount < 10 },
  { id: "mid", label: "$10-$50", match: (amount: number) => amount >= 10 && amount <= 50 },
  { id: "over-50", label: "Over $50", match: (amount: number) => amount > 50 },
] as const;

type ValueBandId = (typeof valueBands)[number]["id"];

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
  const [bands, setBands] = useState<ValueBandId[]>([]);

  const names = useMemo(() => {
    const map: Record<string, string> = {};
    for (const category of categories) map[category.id] = category.name;
    return map;
  }, [categories]);

  const hasUntagged = goals.some((goal) => !goal.category_ids.some((id) => names[id]));
  const showCategories = categories.length > 0;

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return goals;
    return goals.filter(
      (goal) =>
        goal.title.toLowerCase().includes(needle) || (goal.description ?? "").toLowerCase().includes(needle),
    );
  }, [goals, query]);

  const visible = useMemo(() => {
    const matched = searched.filter(
      (goal) => inCategory(goal, categoryId, names) && inBands(goal, bands),
    );
    return sortGoals(matched, sort);
  }, [bands, categoryId, names, searched, sort]);

  function countFor(category: string, bandIds: ValueBandId[]) {
    return searched.filter((goal) => inCategory(goal, category, names) && inBands(goal, bandIds)).length;
  }

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the wishlist yet.</p>;
  }

  const empty = emptyCopy(query, categoryId, bands.length > 0);

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
          className="h-11 rounded-lg border border-input bg-card px-2.5 text-base text-foreground sm:h-10 sm:w-52 sm:text-sm"
        >
          {sorts.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div role="group" aria-label="Value" className="flex flex-wrap gap-2">
        {valueBands.map((band) => {
          const selected = bands.includes(band.id);
          const count = countFor(categoryId, [band.id]);
          return (
            <button
              key={band.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                setBands((current) =>
                  current.includes(band.id) ? current.filter((id) => id !== band.id) : [...current, band.id],
                )
              }
              className={tagPillClass(selected)}
            >
              {band.label} ({count})
            </button>
          );
        })}
      </div>

      {showCategories ? (
        <div role="group" aria-label="Tags" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={categoryId === "all"}
            onClick={() => setCategoryId("all")}
            className={tagPillClass(categoryId === "all")}
          >
            All ({countFor("all", bands)})
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={tagPillClass(categoryId === category.id)}
            >
              {category.name} ({countFor(category.id, bands)})
            </button>
          ))}
          {hasUntagged ? (
            <button
              type="button"
              aria-pressed={categoryId === "none"}
              onClick={() => setCategoryId("none")}
              className={tagPillClass(categoryId === "none")}
            >
              Untagged ({countFor("none", bands)})
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
        <GoalList
          goals={visible}
          paypalLink={paypalLink}
          categories={
            categoryId === "none"
              ? []
              : categoryId === "all"
                ? categories
                : categories.filter((category) => category.id === categoryId)
          }
        />
      )}
    </div>
  );
}

function inCategory(goal: Goal, categoryId: string, names: Record<string, string>) {
  const tagged = goal.category_ids.some((id) => names[id]);
  if (categoryId === "all") return true;
  if (categoryId === "none") return !tagged;
  return goal.category_ids.includes(categoryId);
}

function inBands(goal: Goal, bands: ValueBandId[]) {
  if (bands.length === 0) return true;
  const amount = asNumber(goal.target_amount);
  return valueBands.some((band) => bands.includes(band.id) && band.match(amount));
}

function emptyCopy(query: string, categoryId: string, rangeNarrowed: boolean) {
  if (query.trim()) return "Nothing matches that search.";
  if (categoryId !== "all" && rangeNarrowed) return "Nothing matches those filters.";
  if (categoryId !== "all") return "Nothing with this tag yet.";
  if (rangeNarrowed) return "Nothing in that value range.";
  return "Nothing matches that search.";
}

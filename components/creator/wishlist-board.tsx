"use client";

import { useMemo, useState } from "react";
import { GoalList } from "@/components/creator/goal-list";
import { tagPillClass } from "@/components/wishlist-tags";
import { Input } from "@/components/ui/input";
import { asNumber, formatMoney, progressPercent } from "@/lib/format";
import type { Goal, WishlistCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const bounds = useMemo(() => valueBounds(goals), [goals]);
  const [low, setLow] = useState(bounds.min);
  const [high, setHigh] = useState(bounds.max);
  const rangeLow = clamp(Math.min(low, high), bounds.min, bounds.max);
  const rangeHigh = clamp(Math.max(low, high), bounds.min, bounds.max);
  const canFilterValue = bounds.max > bounds.min;
  const rangeNarrowed = canFilterValue && (rangeLow > bounds.min || rangeHigh < bounds.max);

  const names = useMemo(() => {
    const map: Record<string, string> = {};
    for (const category of categories) map[category.id] = category.name;
    return map;
  }, [categories]);

  const hasUntagged = goals.some((goal) => !goal.category_ids.some((id) => names[id]));
  const showCategories = categories.length > 0;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = goals.filter((goal) => {
      const tagged = goal.category_ids.some((id) => names[id]);
      if (categoryId === "none" && tagged) return false;
      if (categoryId !== "all" && categoryId !== "none" && !goal.category_ids.includes(categoryId)) return false;
      if (canFilterValue) {
        const amount = asNumber(goal.target_amount);
        if (amount < rangeLow || amount > rangeHigh) return false;
      }
      if (!needle) return true;
      return (
        goal.title.toLowerCase().includes(needle) || (goal.description ?? "").toLowerCase().includes(needle)
      );
    });
    return sortGoals(matched, sort);
  }, [canFilterValue, categoryId, goals, names, query, rangeHigh, rangeLow, sort]);

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the wishlist yet.</p>;
  }

  const empty = emptyCopy(query, categoryId, rangeNarrowed);

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

      {canFilterValue ? (
        <ValueRange
          min={bounds.min}
          max={bounds.max}
          low={rangeLow}
          high={rangeHigh}
          onLow={(value) => setLow(Math.min(value, rangeHigh))}
          onHigh={(value) => setHigh(Math.max(value, rangeLow))}
        />
      ) : null}

      {showCategories ? (
        <div role="group" aria-label="Tags" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={categoryId === "all"}
            onClick={() => setCategoryId("all")}
            className={tagPillClass(categoryId === "all")}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={tagPillClass(categoryId === category.id)}
            >
              {category.name}
            </button>
          ))}
          {hasUntagged ? (
            <button
              type="button"
              aria-pressed={categoryId === "none"}
              onClick={() => setCategoryId("none")}
              className={tagPillClass(categoryId === "none")}
            >
              Untagged
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

function valueBounds(goals: Goal[]) {
  if (goals.length === 0) return { min: 0, max: 0 };
  const values = goals.map((goal) => asNumber(goal.target_amount));
  return { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function emptyCopy(query: string, categoryId: string, rangeNarrowed: boolean) {
  if (query.trim()) return "Nothing matches that search.";
  if (categoryId !== "all" && rangeNarrowed) return "Nothing matches those filters.";
  if (categoryId !== "all") return "Nothing with this tag yet.";
  if (rangeNarrowed) return "Nothing in that value range.";
  return "Nothing matches that search.";
}

function ValueRange({
  min,
  max,
  low,
  high,
  onLow,
  onHigh,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onLow: (value: number) => void;
  onHigh: (value: number) => void;
}) {
  const [front, setFront] = useState<"low" | "high">("high");
  const span = max - min || 1;
  const start = ((low - min) / span) * 100;
  const end = ((high - min) / span) * 100;
  const step = span > 1000 ? Math.max(1, Math.round(span / 100)) : 1;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id="wishlist-value-label">Value</span>
        <span className="text-muted-foreground">
          {formatMoney(low)} – {formatMoney(high)}
        </span>
      </div>
      <div role="group" aria-labelledby="wishlist-value-label" className="relative h-11">
        <div className="absolute top-1/2 right-2 left-2 h-1 -translate-y-1/2 rounded-full bg-foreground/15" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `calc(0.5rem + (100% - 1rem) * ${start / 100})`, width: `calc((100% - 1rem) * ${(end - start) / 100})` }}
        />
        <input
          type="range"
          className={cn("dual-range", front === "low" ? "z-20" : "z-10")}
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label="Minimum value"
          aria-valuemin={min}
          aria-valuemax={high}
          aria-valuenow={low}
          aria-valuetext={formatMoney(low)}
          onPointerDown={() => setFront("low")}
          onChange={(event) => onLow(Number(event.target.value))}
        />
        <input
          type="range"
          className={cn("dual-range", front === "high" ? "z-20" : "z-10")}
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label="Maximum value"
          aria-valuemin={low}
          aria-valuemax={max}
          aria-valuenow={high}
          aria-valuetext={formatMoney(high)}
          onPointerDown={() => setFront("high")}
          onChange={(event) => onHigh(Number(event.target.value))}
        />
      </div>
    </div>
  );
}

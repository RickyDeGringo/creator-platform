"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";
import { FormMessage } from "@/components/form-message";
import { PhotoField, type PhotoFieldHandle } from "@/components/dashboard/photo-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WishlistCategories } from "@/components/dashboard/wishlist-categories";
import { WishlistTagField } from "@/components/wishlist-tags";
import { asNumber, formatMoney } from "@/lib/format";
import type { Goal, WishlistCategory } from "@/lib/types";

function goalTagNames(goal: Goal, categories: WishlistCategory[]) {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return goal.category_ids.flatMap((id) => {
    const name = names.get(id);
    return name ? [name] : [];
  });
}

function GoalEditor({
  slug,
  goal,
  categories,
}: {
  slug: string;
  goal: Goal;
  categories: WishlistCategory[];
}) {
  const [state, action, pending] = useActionState(updateGoal.bind(null, slug, goal.id), null);
  const [deleteState, deleteAction] = useActionState(deleteGoal.bind(null, slug), null);
  const [preparing, setPreparing] = useState(false);
  const photosRef = useRef<PhotoFieldHandle>(null);

  const tags = goalTagNames(goal, categories);

  return (
    <article className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div>
        <h3 className="font-medium">{goal.title}</h3>
        <p className="text-sm text-muted-foreground">
          {formatMoney(goal.current_amount_raised)} of {formatMoney(goal.target_amount)}
        </p>
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((name) => (
              <span key={name} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/75">
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <form
        action={(formData) => {
          for (const file of photosRef.current?.files ?? []) formData.append("photos", file);
          action(formData);
        }}
        className="grid gap-3"
      >
        {goal.image_url ? (
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={goal.image_url}
              alt=""
              className="h-24 w-auto max-w-40 rounded-lg bg-muted object-contain"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remove_image" className="size-4" />
              Remove photo
            </label>
          </div>
        ) : null}
        <PhotoField
          id={`goal-photo-${goal.id}`}
          label="Photo"
          hint="One photo of the thing. It stays in proportion."
          max={1}
          multiple={false}
          revision={state}
          onPreparing={setPreparing}
          fieldRef={photosRef}
        />
        <WishlistTagField categories={categories} selectedIds={goal.category_ids} />
        <div className="space-y-2">
          <Label htmlFor={`link-${goal.id}`}>Shop or support link</Label>
          <Input
            id={`link-${goal.id}`}
            name="link"
            type="url"
            inputMode="url"
            maxLength={2000}
            defaultValue={goal.link ?? ""}
            placeholder="https://"
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grow space-y-2">
            <Label htmlFor={`raised-${goal.id}`}>Amount raised (USD)</Label>
            <Input
              id={`raised-${goal.id}`}
              name="current_amount_raised"
              inputMode="decimal"
              defaultValue={asNumber(goal.current_amount_raised).toFixed(2)}
              className="h-10"
            />
          </div>
          <Button type="submit" disabled={pending || preparing}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
      <FormMessage state={state} />
      <form action={deleteAction}>
        <input type="hidden" name="goalId" value={goal.id} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            if (!window.confirm("Delete this goal?")) event.preventDefault();
          }}
        >
          Delete goal
        </Button>
      </form>
      <FormMessage state={deleteState} />
    </article>
  );
}

export function GoalManager({
  slug,
  goals,
  categories,
}: {
  slug: string;
  goals: Goal[];
  categories: WishlistCategory[];
}) {
  const [state, action, pending] = useActionState(createGoal.bind(null, slug), null);
  const [preparing, setPreparing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const photosRef = useRef<PhotoFieldHandle>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-6">
      <WishlistCategories slug={slug} categories={categories} />
      <form
        ref={formRef}
        action={(formData) => {
          for (const file of photosRef.current?.files ?? []) formData.append("photos", file);
          action(formData);
        }}
        className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="space-y-2">
          <Label htmlFor="title">Goal title</Label>
          <Input id="title" name="title" required maxLength={120} className="h-10" />
        </div>
        <WishlistTagField categories={categories} revision={state} />
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" className="min-h-20" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal-link">Shop or support link</Label>
          <Input
            id="goal-link"
            name="link"
            type="url"
            inputMode="url"
            maxLength={2000}
            placeholder="https:// — a saddle, a bell, or a PayPal link"
            className="h-10"
          />
          <p className="text-sm text-muted-foreground">
            Optional. People use this link to buy the thing or chip in. Leave it blank to use the page payment link.
          </p>
        </div>
        <PhotoField
          id="goal-photo"
          label="Photo"
          hint="One photo of the thing. It stays in proportion."
          max={1}
          multiple={false}
          revision={state}
          onPreparing={setPreparing}
          fieldRef={photosRef}
        />
        <div className="space-y-2">
          <Label htmlFor="target_amount">Target amount (USD)</Label>
          <Input id="target_amount" name="target_amount" inputMode="decimal" required placeholder="250.00" className="h-10" />
        </div>
        <FormMessage state={state} />
        <Button type="submit" disabled={pending || preparing}>
          {pending ? "Creating…" : "Create goal"}
        </Button>
      </form>
      <div className="grid gap-3">
        {goals.map((goal) => (
          <GoalEditor
            key={`${goal.id}-${goal.current_amount_raised}-${goal.link ?? ""}-${goal.image_url ?? ""}-${goal.category_ids.join(",")}`}
            slug={slug}
            goal={goal}
            categories={categories}
          />
        ))}
      </div>
    </div>
  );
}

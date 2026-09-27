"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createGoal, deleteGoal, updateGoal, updateGoalRaised } from "@/app/actions/goals";
import { FormMessage } from "@/components/form-message";
import { PhotoField, type PhotoFieldHandle } from "@/components/dashboard/photo-field";
import { WishlistCategories } from "@/components/dashboard/wishlist-categories";
import { WishlistTagField } from "@/components/wishlist-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { asNumber, formatMoney } from "@/lib/format";
import type { Goal, WishlistCategory } from "@/lib/types";

function goalTags(goal: Goal, categories: WishlistCategory[]) {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return goal.category_ids.flatMap((id) => {
    const name = names.get(id);
    return name ? [{ id, name }] : [];
  });
}

function GoalDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] max-h-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-0 bg-card p-5 text-foreground shadow-2xl backdrop:bg-black/60"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-heading text-2xl">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}

function GoalForm({
  slug,
  goal,
  categories,
  onDone,
}: {
  slug: string;
  goal?: Goal;
  categories: WishlistCategory[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    goal ? updateGoal.bind(null, slug, goal.id) : createGoal.bind(null, slug),
    null,
  );
  const [deleteState, deleteAction] = useActionState(deleteGoal.bind(null, slug), null);
  const [preparing, setPreparing] = useState(false);
  const photosRef = useRef<PhotoFieldHandle>(null);

  useEffect(() => {
    if (state?.success || deleteState?.success) onDone();
  }, [deleteState, onDone, state]);

  return (
    <div className="space-y-4">
      <form
        action={(formData) => {
          for (const file of photosRef.current?.files ?? []) formData.append("photos", file);
          action(formData);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor={`title-${goal?.id ?? "new"}`}>Title</Label>
          <Input
            id={`title-${goal?.id ?? "new"}`}
            name="title"
            required
            maxLength={120}
            defaultValue={goal?.title ?? ""}
            className="h-10"
          />
        </div>
        <WishlistTagField categories={categories} selectedIds={goal?.category_ids ?? []} revision={goal ? null : state} />
        <div className="space-y-2">
          <Label htmlFor={`description-${goal?.id ?? "new"}`}>Description</Label>
          <Textarea
            id={`description-${goal?.id ?? "new"}`}
            name="description"
            defaultValue={goal?.description ?? ""}
            className="min-h-20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`link-${goal?.id ?? "new"}`}>Shop or support link</Label>
          <Input
            id={`link-${goal?.id ?? "new"}`}
            name="link"
            type="url"
            inputMode="url"
            maxLength={2000}
            defaultValue={goal?.link ?? ""}
            placeholder="https://"
            className="h-10"
          />
        </div>
        {goal?.image_url ? (
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={goal.image_url} alt="" className="h-20 w-auto max-w-32 rounded-lg bg-muted object-contain" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remove_image" className="size-4" />
              Remove photo
            </label>
          </div>
        ) : null}
        <PhotoField
          id={`goal-photo-${goal?.id ?? "new"}`}
          label="Photo"
          hint="One photo of the thing. It stays in proportion."
          max={1}
          multiple={false}
          revision={state}
          onPreparing={setPreparing}
          fieldRef={photosRef}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`target-${goal?.id ?? "new"}`}>Target (USD)</Label>
            <Input
              id={`target-${goal?.id ?? "new"}`}
              name="target_amount"
              inputMode="decimal"
              required
              defaultValue={goal ? asNumber(goal.target_amount).toFixed(2) : ""}
              placeholder="250.00"
              className="h-10"
            />
          </div>
          {goal ? (
            <div className="space-y-2">
              <Label htmlFor={`modal-raised-${goal.id}`}>Amount raised (USD)</Label>
              <Input
                id={`modal-raised-${goal.id}`}
                name="current_amount_raised"
                inputMode="decimal"
                required
                defaultValue={asNumber(goal.current_amount_raised).toFixed(2)}
                className="h-10"
              />
            </div>
          ) : null}
        </div>
        <FormMessage state={state} />
        <Button type="submit" disabled={pending || preparing}>
          {pending ? "Saving…" : goal ? "Save" : "Create goal"}
        </Button>
      </form>
      {goal ? (
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
          <FormMessage state={deleteState} />
        </form>
      ) : null}
    </div>
  );
}

function GoalRow({
  slug,
  goal,
  categories,
}: {
  slug: string;
  goal: Goal;
  categories: WishlistCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateGoalRaised.bind(null, slug, goal.id), null);
  const raised = asNumber(goal.current_amount_raised).toFixed(2);
  const tags = goalTags(goal, categories);

  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
        <button type="button" onClick={() => setOpen(true)} className="shrink-0" aria-label={`Edit ${goal.title}`}>
          {goal.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={goal.image_url} alt="" className="size-10 rounded-md bg-muted object-cover" />
          ) : (
            <span className="block size-10 rounded-md bg-muted" />
          )}
        </button>
        <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-medium">{goal.title}</span>
          {tags.length > 0 ? (
            <span className="mt-1 flex gap-1 overflow-hidden">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70"
                >
                  {tag.name}
                </span>
              ))}
            </span>
          ) : null}
        </button>
        <form action={action} className="ml-auto flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <label className="sr-only" htmlFor={`raised-${goal.id}`}>
            Amount raised for {goal.title}
          </label>
          <Input
            id={`raised-${goal.id}`}
            name="current_amount_raised"
            inputMode="decimal"
            defaultValue={raised}
            aria-label={`Amount raised for ${goal.title}`}
            disabled={pending}
            className="h-8 w-24 text-right"
            onBlur={(event) => {
              if (event.currentTarget.value !== raised) event.currentTarget.form?.requestSubmit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <span className="whitespace-nowrap text-sm text-muted-foreground">of {formatMoney(goal.target_amount)}</span>
        </form>
      </div>
      {state?.error ? <p className="px-3 pb-2 text-xs text-destructive">{state.error}</p> : null}
      {open ? (
        <GoalDialog title={goal.title} onClose={() => setOpen(false)}>
          <GoalForm slug={slug} goal={goal} categories={categories} onDone={() => setOpen(false)} />
        </GoalDialog>
      ) : null}
    </li>
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
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <WishlistCategories slug={slug} categories={categories} />
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Items</h3>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            Add item
          </Button>
        </div>
        {goals.length === 0 ? (
          <p className="rounded-2xl bg-card px-3 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
            No items yet.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded-2xl bg-card ring-1 ring-foreground/10">
            {goals.map((goal) => (
              <GoalRow
                key={`${goal.id}-${goal.current_amount_raised}-${goal.target_amount}-${goal.title}-${goal.link ?? ""}-${goal.image_url ?? ""}-${goal.description ?? ""}-${goal.category_ids.join(",")}`}
                slug={slug}
                goal={goal}
                categories={categories}
              />
            ))}
          </ul>
        )}
      </section>
      {creating ? (
        <GoalDialog title="Add item" onClose={() => setCreating(false)}>
          <GoalForm slug={slug} categories={categories} onDone={() => setCreating(false)} />
        </GoalDialog>
      ) : null}
    </div>
  );
}

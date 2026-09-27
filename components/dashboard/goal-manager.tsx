"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGoal, deleteGoal, updateGoalAmount } from "@/app/actions/goals";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { asNumber, formatMoney } from "@/lib/format";
import type { Goal } from "@/lib/types";

function GoalEditor({ slug, goal }: { slug: string; goal: Goal }) {
  const [state, action] = useActionState(updateGoalAmount.bind(null, slug, goal.id), null);
  const [deleteState, deleteAction] = useActionState(deleteGoal.bind(null, slug), null);

  return (
    <article className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div>
        <h3 className="font-medium">{goal.title}</h3>
        <p className="text-sm text-muted-foreground">
          {formatMoney(goal.current_amount_raised)} of {formatMoney(goal.target_amount)}
        </p>
      </div>
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
        <Button type="submit">Save amount</Button>
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

export function GoalManager({ slug, goals }: { slug: string; goals: Goal[] }) {
  const [state, action] = useActionState(createGoal.bind(null, slug), null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={action} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="space-y-2">
          <Label htmlFor="title">Goal title</Label>
          <Input id="title" name="title" required maxLength={120} className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" className="min-h-20" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_amount">Target amount (USD)</Label>
          <Input id="target_amount" name="target_amount" inputMode="decimal" required placeholder="250.00" className="h-10" />
        </div>
        <FormMessage state={state} />
        <Button type="submit">Create goal</Button>
      </form>
      <div className="grid gap-3">
        {goals.map((goal) => (
          <GoalEditor key={`${goal.id}-${goal.current_amount_raised}`} slug={slug} goal={goal} />
        ))}
      </div>
    </div>
  );
}

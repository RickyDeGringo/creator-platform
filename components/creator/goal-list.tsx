import { ContributeButton } from "@/components/creator/contribute-button";
import { formatMoney, paypalMeHandle, progressPercent } from "@/lib/format";
import type { Goal, WishlistCategory } from "@/lib/types";

export function GoalList({
  goals,
  paypalLink,
  categories = [],
}: {
  goals: Goal[];
  paypalLink: string | null;
  categories?: Pick<WishlistCategory, "id" | "name">[];
}) {
  const canPay = paypalMeHandle(paypalLink) != null;

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the wishlist yet.</p>;
  }

  const names: Record<string, string> = {};
  for (const category of categories) names[category.id] = category.name;
  const groups = groupGoals(goals, categories);

  return (
    <div className="grid gap-6">
      {canPay ? null : (
        <p className="text-sm text-muted-foreground">This creator has not added a PayPal.Me link.</p>
      )}
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`wishlist-${group.id}`} className="grid gap-3">
          <h3
            id={`wishlist-${group.id}`}
            className="sticky top-(--creator-stick) z-20 -mx-4 bg-background/95 px-4 py-2 font-heading text-2xl backdrop-blur-md"
          >
            {group.name}
          </h3>
          {group.goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} paypalLink={paypalLink} categoryNames={names} />
          ))}
        </section>
      ))}
    </div>
  );
}

function groupGoals(goals: Goal[], categories: Pick<WishlistCategory, "id" | "name">[]) {
  const buckets = new Map<string, Goal[]>();
  const untagged: Goal[] = [];
  const known = new Set(categories.map((category) => category.id));

  for (const goal of goals) {
    const category = categories.find((item) => goal.category_ids.includes(item.id));
    if (!category || !known.has(category.id)) {
      untagged.push(goal);
      continue;
    }
    const list = buckets.get(category.id) ?? [];
    list.push(goal);
    buckets.set(category.id, list);
  }

  const groups = categories.flatMap((category) => {
    const items = buckets.get(category.id);
    return items && items.length > 0 ? [{ id: category.id, name: category.name, goals: items }] : [];
  });
  if (untagged.length > 0) groups.push({ id: "untagged", name: "Untagged", goals: untagged });
  return groups;
}

function GoalCard({
  goal,
  paypalLink,
  categoryNames,
}: {
  goal: Goal;
  paypalLink: string | null;
  categoryNames: Record<string, string>;
}) {
  const pct = progressPercent(goal.current_amount_raised, goal.target_amount);
  const tags = (goal.category_ids ?? [])
    .flatMap((id) => {
      const name = categoryNames[id];
      return name ? [{ id, name }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <article className="flex items-start gap-4 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
      {goal.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={goal.image_url}
          alt=""
          width={goal.image_width ?? 400}
          height={goal.image_height ?? 400}
          className="size-28 shrink-0 rounded-xl bg-muted object-cover sm:size-36"
        />
      ) : (
        <div className="size-28 shrink-0 rounded-xl bg-muted sm:size-36" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {tags.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/75"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
            <h4 className="font-heading text-2xl leading-tight">{goal.title}</h4>
            {goal.description ? (
              <p className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">{goal.description}</p>
            ) : null}
          </div>
          <ContributeButton paypalLink={paypalLink} itemTitle={goal.title} />
        </div>
        <div className="mt-3">
          <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${goal.title} progress`}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatMoney(goal.current_amount_raised)} raised of {formatMoney(goal.target_amount)}
          </p>
        </div>
      </div>
    </article>
  );
}

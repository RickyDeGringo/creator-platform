import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { formatMoney, progressPercent, supportLink } from "@/lib/format";
import type { Goal } from "@/lib/types";

export function GoalList({
  goals,
  paypalLink,
  categoryNames,
}: {
  goals: Goal[];
  paypalLink: string | null;
  categoryNames?: Record<string, string>;
}) {
  const hasSupport = goals.some((goal) => supportLink(goal.link, paypalLink));

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the wishlist yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {hasSupport ? null : (
        <p className="text-sm text-muted-foreground">This creator has not added a payment link.</p>
      )}
      {goals.map((goal) => {
        const pct = progressPercent(goal.current_amount_raised, goal.target_amount);
        const support = supportLink(goal.link, paypalLink);
        const tags = (goal.category_ids ?? [])
          .flatMap((id) => {
            const name = categoryNames?.[id];
            return name ? [{ id, name }] : [];
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          <article key={goal.id} className="flex items-start gap-4 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
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
                  <h3 className="font-heading text-2xl leading-tight">{goal.title}</h3>
                  {goal.description ? (
                    <p className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">{goal.description}</p>
                  ) : null}
                </div>
                {support ? (
                  <a
                    href={support.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
                  >
                    {support.label}
                  </a>
                ) : null}
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
      })}
    </div>
  );
}

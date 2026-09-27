import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
        const category = goal.category_id ? categoryNames?.[goal.category_id] : undefined;
        return (
          <article key={goal.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            {category ? (
              <Badge variant="secondary" className="mb-3">
                {category}
              </Badge>
            ) : null}
            {goal.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={goal.image_url}
                alt=""
                width={goal.image_width ?? undefined}
                height={goal.image_height ?? undefined}
                className="mb-3 h-44 w-full rounded-xl bg-muted object-contain"
              />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-2xl leading-tight">{goal.title}</h3>
                {goal.description ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{goal.description}</p>
                ) : null}
              </div>
              {support ? (
                <a
                  href={support.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "sm" })}
                >
                  {support.label}
                </a>
              ) : null}
            </div>
            <div className="mt-4">
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
          </article>
        );
      })}
    </div>
  );
}

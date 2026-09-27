import { buttonVariants } from "@/components/ui/button";
import { formatMoney, httpsUrl, progressPercent } from "@/lib/format";
import type { Goal } from "@/lib/types";

export function GoalList({ goals, paypalLink }: { goals: Goal[]; paypalLink: string | null }) {
  const donateHref = httpsUrl(paypalLink);

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">No active goals yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {donateHref ? null : (
        <p className="text-sm text-muted-foreground">This creator has not added a payment link.</p>
      )}
      {goals.map((goal) => {
        const pct = progressPercent(goal.current_amount_raised, goal.target_amount);
        return (
          <article key={goal.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-2xl leading-tight">{goal.title}</h3>
                {goal.description ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{goal.description}</p>
                ) : null}
              </div>
              {donateHref ? (
                <a
                  href={donateHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "sm" })}
                >
                  Donate
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

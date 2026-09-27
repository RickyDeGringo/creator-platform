import { PostComments } from "@/components/creator/post-comments";
import { PostFrame } from "@/components/creator/post-edit";
import { PostGallery } from "@/components/creator/post-gallery";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney, httpsUrl, progressPercent, supportLink } from "@/lib/format";
import type { CommentAccess, FeedPost, Goal, WishlistCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostFeed({
  posts,
  paypalLink,
  slug,
  access,
  canManage,
  goals,
  categories,
}: {
  posts: FeedPost[];
  paypalLink: string | null;
  slug: string;
  access: CommentAccess;
  canManage: boolean;
  goals: Pick<Goal, "id" | "title" | "category_id">[];
  categories: Pick<WishlistCategory, "id" | "name">[];
}) {
  const subscribeHref = httpsUrl(paypalLink);
  const eagerId = posts.find((post) => !post.is_locked && post.images.length > 0)?.id;

  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">No posts yet.</p>;
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) =>
        post.is_locked ? (
          <article key={post.id} className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            <div className="pointer-events-none select-none space-y-3 p-5 blur-sm" aria-hidden="true">
              <div className="h-36 rounded-xl bg-foreground/25" />
              <div className="h-3 w-11/12 rounded-full bg-foreground/40" />
              <div className="h-3 w-8/12 rounded-full bg-foreground/30" />
              <div className="h-3 w-5/12 rounded-full bg-foreground/20" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/35 px-6 text-center backdrop-blur-md">
              <p className="font-heading text-3xl">Members only</p>
              {subscribeHref ? (
                <a
                  href={subscribeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "lg" })}
                >
                  Subscribe to Unlock
                </a>
              ) : (
                <span className={buttonVariants({ size: "lg" })} aria-disabled="true">
                  Subscribe to Unlock
                </span>
              )}
            </div>
          </article>
        ) : (
          <article key={post.id} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <PostFrame slug={slug} post={post} canManage={canManage} goals={goals} categories={categories}>
            {post.images.length > 0 ? (
              <div className="mb-4">
                <PostGallery images={post.images} alt={photoAlt(post.content)} priority={post.id === eagerId} />
              </div>
            ) : null}
            {post.content ? (
              <p className="text-base leading-7 whitespace-pre-wrap break-words">{post.content}</p>
            ) : null}
            {post.goals.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {post.goals.map((goal) => {
                  const support = supportLink(goal.link, paypalLink);
                  const pct = progressPercent(goal.current_amount_raised, goal.target_amount);
                  return (
                    <li
                      key={goal.id}
                      className="flex flex-col gap-3 rounded-xl bg-muted/70 p-3 sm:flex-row sm:items-center"
                    >
                      {goal.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={goal.image.url}
                          alt=""
                          width={goal.image.width ?? undefined}
                          height={goal.image.height ?? undefined}
                          className="size-14 shrink-0 rounded-lg bg-background object-contain"
                        />
                      ) : null}
                      <div className="min-w-0 grow">
                        <p className="truncate text-sm font-medium">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(goal.current_amount_raised)} of {formatMoney(goal.target_amount)}
                        </p>
                        <div
                          role="progressbar"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${goal.title} progress`}
                          className="mt-2 h-1 overflow-hidden rounded-full bg-background"
                        >
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
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
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <PostComments slug={slug} postId={post.id} comments={post.comments} access={access} />
            </PostFrame>
          </article>
        ),
      )}
    </div>
  );
}

function photoAlt(content: string | null) {
  const line = content
    ?.split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return "Post photo";
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

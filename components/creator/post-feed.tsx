import Link from "next/link";
import { CreatorAvatar } from "@/components/creator/creator-avatar";
import { LockIcon } from "@/components/creator/lock-icon";
import { PostComments } from "@/components/creator/post-comments";
import { PostJumpStrip } from "@/components/creator/post-jump-strip";
import { PostReactions } from "@/components/creator/post-reactions";
import { PostFrame } from "@/components/creator/post-edit";
import { PostGallery } from "@/components/creator/post-gallery";
import { SeenPosts } from "@/components/home/seen-posts";
import { buttonVariants } from "@/components/ui/button";
import { ContributeButton } from "@/components/creator/contribute-button";
import { formatMoney, formatTimestamp, httpsUrl, progressPercent } from "@/lib/format";
import type { CommentAccess, FeedCreator, FeedPost, Goal, WishlistCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostFeed({
  posts,
  paypalLink,
  slug,
  access,
  canManage,
  goals,
  categories,
  showJumpStrip = true,
  markSeen = false,
}: {
  posts: FeedPost[];
  paypalLink: string | null;
  slug: string;
  access: CommentAccess;
  canManage: boolean;
  goals: Pick<Goal, "id" | "title" | "category_ids">[];
  categories: Pick<WishlistCategory, "id" | "name">[];
  showJumpStrip?: boolean;
  markSeen?: boolean;
}) {
  const eagerId = posts.find((post) => !post.is_locked && post.images.length > 0)?.id;

  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">No posts yet.</p>;
  }

  const list = (
    <div className="grid gap-4">
      {showJumpStrip ? <PostJumpStrip posts={posts} /> : null}
      {posts.map((post) => {
        const postSlug = post.creator?.slug ?? slug;
        const postPaypal = post.creator?.paypalLink ?? paypalLink;
        const subscribeHref = httpsUrl(postPaypal);
        return post.is_locked ? (
          <article
            key={post.id}
            id={`post-${post.id}`}
            data-seen-post={post.id}
            data-seen-page={post.page_id}
            data-unseen={post.unseen ? "1" : undefined}
            className="scroll-mt-[calc(var(--creator-stick)+5.75rem)] overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
          >
            {post.creator ? (
              <div className="flex items-center justify-between gap-3 px-5 pt-5">
                <CreatorByline creator={post.creator} className="mb-0" />
                <time dateTime={post.created_at} className="shrink-0 text-sm text-muted-foreground" suppressHydrationWarning>
                  {formatTimestamp(post.created_at)}
                </time>
              </div>
            ) : null}
            <div className="relative min-h-72">
            <div className="pointer-events-none select-none space-y-3 p-5 blur-sm" aria-hidden="true">
              {(post.image_count ?? 0) > 0 ? (
                <div
                  className="h-48 scale-110 rounded-xl"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 30%, oklch(0.7 0.1 45), transparent 38%), radial-gradient(circle at 72% 70%, oklch(0.38 0.05 30), transparent 42%), linear-gradient(160deg, oklch(0.48 0.05 55), oklch(0.22 0.02 40))",
                  }}
                />
              ) : (
                <div className="h-36 rounded-xl bg-foreground/25" />
              )}
              <div className="h-3 w-11/12 rounded-full bg-foreground/40" />
              <div className="h-3 w-8/12 rounded-full bg-foreground/30" />
              <div className="h-3 w-5/12 rounded-full bg-foreground/20" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/35 px-6 text-center backdrop-blur-md">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm">
                <LockIcon className="size-5" />
              </span>
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
            </div>
          </article>
        ) : (
          <article
            key={post.id}
            id={`post-${post.id}`}
            data-seen-post={post.id}
            data-seen-page={post.page_id}
            data-unseen={post.unseen ? "1" : undefined}
            className="scroll-mt-[calc(var(--creator-stick)+5.75rem)] rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
          >
            {post.creator ? <CreatorByline creator={post.creator} /> : null}
            <PostFrame slug={postSlug} post={post} canManage={canManage} goals={goals} categories={categories}>
            {post.images.length > 0 ? (
              <div className="mb-4">
                <PostGallery images={post.images} alt={photoAlt(post.content, post.title)} priority={post.id === eagerId} />
              </div>
            ) : null}
            {post.title ? <h2 className="font-heading text-3xl leading-none tracking-tight">{post.title}</h2> : null}
            {post.content ? (
              <p className={cn("text-base leading-7 whitespace-pre-wrap break-words", post.title && "mt-3")}>{post.content}</p>
            ) : null}
            {post.goals.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {post.goals.map((goal) => {
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
                      <ContributeButton paypalLink={postPaypal} itemTitle={goal.title} className="sm:shrink-0" />
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <PostReactions
              slug={postSlug}
              postId={post.id}
              reactions={post.reactions}
              viewerReactions={post.viewerReactions}
              access={access}
            />
            <PostComments slug={postSlug} postId={post.id} comments={post.comments} access={access} />
            </PostFrame>
          </article>
        );
      })}
    </div>
  );

  return markSeen ? <SeenPosts>{list}</SeenPosts> : list;
}

function CreatorByline({ creator, className }: { creator: FeedCreator; className?: string }) {
  return (
    <Link href={`/${creator.slug}`} className={cn("mb-4 flex min-w-0 items-center gap-3", className)}>
      <CreatorAvatar name={creator.displayName} url={creator.avatarUrl} className="size-10" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{creator.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">@{creator.slug}</span>
      </span>
    </Link>
  );
}

function photoAlt(content: string | null, title?: string | null) {
  const titled = title?.trim();
  if (titled) return titled.length > 120 ? `${titled.slice(0, 117)}…` : titled;
  const line = content
    ?.split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return "Post photo";
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

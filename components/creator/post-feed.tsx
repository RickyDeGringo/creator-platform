import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, httpsUrl } from "@/lib/format";
import type { FeedPost } from "@/lib/types";

export function PostFeed({ posts, paypalLink }: { posts: FeedPost[]; paypalLink: string | null }) {
  const subscribeHref = httpsUrl(paypalLink);

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
            <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
              {post.is_paywalled ? <Badge variant="secondary">Members</Badge> : null}
            </div>
            {httpsUrl(post.image_url) ? (
              // User-supplied URLs are not known at build time, so they stay outside next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={httpsUrl(post.image_url) ?? ""}
                alt=""
                className="mb-4 max-h-96 w-full rounded-xl object-cover"
              />
            ) : null}
            {post.content ? (
              <p className="text-base leading-7 whitespace-pre-wrap break-words">{post.content}</p>
            ) : null}
          </article>
        ),
      )}
    </div>
  );
}

import { FollowButton } from "@/components/creator/follow-button";
import { GoalList } from "@/components/creator/goal-list";
import { PostFeed } from "@/components/creator/post-feed";
import { formatFollowers, httpsUrl } from "@/lib/format";
import type { FeedPost, Goal } from "@/lib/types";

export function CreatorView({
  slug,
  pageId,
  displayName,
  bio,
  coverImage,
  paypalLink,
  followerCount,
  isFollowing,
  signedIn,
  goals,
  posts,
  notice,
}: {
  slug: string;
  pageId: string;
  displayName: string;
  bio: string | null;
  coverImage: string | null;
  paypalLink: string | null;
  followerCount: number;
  isFollowing: boolean;
  signedIn: boolean;
  goals: Goal[];
  posts: FeedPost[];
  notice?: string | null;
}) {
  const cover = httpsUrl(coverImage);

  return (
    <div>
      <section className="relative h-56 overflow-hidden sm:h-72">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-[radial-gradient(circle_at_top_left,oklch(0.55_0.16_40),transparent_42%),linear-gradient(160deg,oklch(0.28_0.03_70),oklch(0.16_0.012_65))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent" />
      </section>

      <div className="mx-auto w-full max-w-3xl px-4 pb-20">
        <div className="relative -mt-14">
          <p className="text-sm tracking-wide text-muted-foreground uppercase">@{slug}</p>
          <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-6xl">{displayName}</h1>
          {bio ? <p className="mt-4 max-w-xl text-base leading-7 text-pretty">{bio}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <FollowButton slug={slug} pageId={pageId} isFollowing={isFollowing} signedIn={signedIn} />
            <p className="text-sm text-muted-foreground">{formatFollowers(followerCount)}</p>
          </div>
          {notice ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {notice}
            </p>
          ) : null}
        </div>

        <section className="mt-12">
          <h2 className="mb-4 font-heading text-3xl">Goals</h2>
          <GoalList goals={goals} paypalLink={paypalLink} />
        </section>

        <section className="mt-12">
          <h2 className="mb-4 font-heading text-3xl">Posts</h2>
          <PostFeed posts={posts} paypalLink={paypalLink} />
        </section>
      </div>
    </div>
  );
}

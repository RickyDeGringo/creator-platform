import { CoverBanner } from "@/components/creator/cover-banner";
import { CreatorTabs } from "@/components/creator/creator-tabs";
import { FollowButton } from "@/components/creator/follow-button";
import { PostFeed } from "@/components/creator/post-feed";
import { WishlistBoard } from "@/components/creator/wishlist-board";
import { formatFollowers } from "@/lib/format";
import type { CommentAccess, FeedPost, Goal, PostImage, WishlistCategory } from "@/lib/types";

export function CreatorView({
  slug,
  pageId,
  displayName,
  bio,
  covers,
  paypalLink,
  followerCount,
  isFollowing,
  signedIn,
  commentAccess,
  goals,
  categories,
  posts,
  canManage,
  notice,
}: {
  slug: string;
  pageId: string;
  displayName: string;
  bio: string | null;
  covers: PostImage[];
  paypalLink: string | null;
  followerCount: number;
  isFollowing: boolean;
  signedIn: boolean;
  commentAccess: CommentAccess;
  goals: Goal[];
  categories: WishlistCategory[];
  posts: FeedPost[];
  canManage: boolean;
  notice?: string | null;
}) {
  return (
    <div>
      <div className="relative">
        <CoverBanner images={covers} />
        <div className="pointer-events-none absolute right-3 bottom-3 z-10 sm:right-4 sm:bottom-4">
          <div className="pointer-events-auto drop-shadow-md">
            <FollowButton slug={slug} pageId={pageId} isFollowing={isFollowing} signedIn={signedIn} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-20">
        <div className="mt-5">
          <p className="text-sm tracking-wide text-muted-foreground uppercase">@{slug}</p>
          <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-6xl">{displayName}</h1>
          {bio ? <p className="mt-4 max-w-xl text-base leading-7 text-pretty">{bio}</p> : null}
          <p className="mt-5 text-sm text-muted-foreground">{formatFollowers(followerCount)}</p>
          {notice ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {notice}
            </p>
          ) : null}
        </div>

        <CreatorTabs
          wishlist={<WishlistBoard goals={goals} categories={categories} paypalLink={paypalLink} />}
          posts={
            <PostFeed
              posts={posts}
              paypalLink={paypalLink}
              slug={slug}
              access={commentAccess}
              canManage={canManage}
              goals={goals}
              categories={categories}
            />
          }
        />
      </div>
    </div>
  );
}

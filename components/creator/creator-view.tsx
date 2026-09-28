import { CoverBanner } from "@/components/creator/cover-banner";
import { CreatorTabs } from "@/components/creator/creator-tabs";
import { FollowButton } from "@/components/creator/follow-button";
import { PageLinkRow } from "@/components/creator/page-link-row";
import { PostFeed } from "@/components/creator/post-feed";
import { WishlistBoard } from "@/components/creator/wishlist-board";
import { formatFollowers } from "@/lib/format";
import type { IconSet, PageLinks } from "@/lib/page-links";
import type { CommentAccess, FeedPost, Goal, PostImage, WishlistCategory } from "@/lib/types";

export function CreatorView({
  slug,
  pageId,
  displayName,
  bio,
  covers,
  paypalLink,
  followerCount,
  links,
  iconSet,
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
  links: PageLinks;
  iconSet: IconSet;
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
      <CoverBanner images={covers} />

      <div className="mx-auto w-full max-w-3xl px-4 pb-20">
        <div className="mt-5">
          <p className="text-sm tracking-wide text-muted-foreground uppercase">@{slug}</p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <h1 className="min-w-0 font-heading text-5xl leading-none tracking-tight break-words sm:text-6xl">
              {displayName}
            </h1>
            <FollowButton slug={slug} pageId={pageId} isFollowing={isFollowing} signedIn={signedIn} />
          </div>
          {bio ? <p className="mt-4 max-w-xl text-base leading-7 text-pretty">{bio}</p> : null}
          <p className="mt-5 text-sm text-muted-foreground">{formatFollowers(followerCount)}</p>
          <PageLinkRow links={links} iconSet={iconSet} />
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

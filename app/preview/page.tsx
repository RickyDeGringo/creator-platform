import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessManager } from "@/components/dashboard/access-manager";
import { GoalManager } from "@/components/dashboard/goal-manager";
import { MemberManager } from "@/components/dashboard/member-manager";
import { PostManager } from "@/components/dashboard/post-manager";
import { CreatorView } from "@/components/creator/creator-view";
import { RedeemForm } from "@/components/redeem-form";
import { isSupabaseConfigured } from "@/lib/env";
import type { AccessCode, FeedPost, Goal, ManagedPost, PageMember, WishlistCategory } from "@/lib/types";

export const metadata: Metadata = { title: "UI preview" };

const categories: WishlistCategory[] = [
  {
    id: "cat-gear",
    page_id: "page-1",
    name: "Gear",
    created_at: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "cat-studio",
    page_id: "page-1",
    name: "Studio",
    created_at: "2026-08-02T00:00:00.000Z",
  },
];

const goals: Goal[] = [
  {
    id: "goal-1",
    page_id: "page-1",
    category_id: "cat-gear",
    title: "New saddle",
    description: "The current one is done after this season.",
    link: "https://example.com/saddle",
    image_url: null,
    image_storage_path: null,
    image_width: null,
    image_height: null,
    target_amount: 180,
    current_amount_raised: 45,
    created_at: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "goal-2",
    page_id: "page-1",
    category_id: null,
    title: "New bell",
    description: null,
    link: "https://example.com/bell",
    image_url: null,
    image_storage_path: null,
    image_width: null,
    image_height: null,
    target_amount: 25,
    current_amount_raised: 10,
    created_at: "2026-09-02T00:00:00.000Z",
  },
];

const posts: FeedPost[] = [
  {
    id: "post-1",
    page_id: "page-1",
    content: "Long climb today. The saddle is finished and the bell barely rings.",
    image_url: null,
    images: [],
    goals: [
      {
        id: "goal-1",
        title: "New saddle",
        link: "https://example.com/saddle",
        image: null,
        target_amount: 180,
        current_amount_raised: 45,
      },
      {
        id: "goal-2",
        title: "New bell",
        link: "https://example.com/bell",
        image: null,
        target_amount: 25,
        current_amount_raised: 10,
      },
    ],
    comments: [
      {
        id: "comment-1",
        body: "That descent looked freezing.",
        created_at: "2026-09-20T12:00:00.000Z",
        author: {
          id: "user-1",
          username: "rider",
          tiktok: "https://www.tiktok.com/@rider",
          facebook: null,
          x: "https://x.com/rider",
          instagram: "https://www.instagram.com/rider",
        },
        replies: [
          {
            id: "comment-2",
            body: "It was. The bell did not survive.",
            created_at: "2026-09-20T13:00:00.000Z",
            author: {
              id: "user-2",
              username: "nova",
              tiktok: null,
              facebook: "https://www.facebook.com/nova",
              x: null,
              instagram: null,
            },
          },
        ],
      },
    ],
    is_paywalled: false,
    is_locked: false,
    created_at: "2026-09-20T00:00:00.000Z",
  },
  {
    id: "post-2",
    page_id: "page-1",
    content: null,
    image_url: null,
    images: [],
    goals: [],
    comments: [],
    is_paywalled: true,
    is_locked: true,
    created_at: "2026-09-22T00:00:00.000Z",
  },
];

const managedPosts: ManagedPost[] = [
  {
    id: "post-1",
    page_id: "page-1",
    content: "Long climb today.",
    image_url: null,
    images: [],
    goals: [
      { id: "goal-1", title: "New saddle" },
      { id: "goal-2", title: "New bell" },
    ],
    is_paywalled: false,
    created_at: "2026-09-20T00:00:00.000Z",
  },
];

const members: PageMember[] = [
  { userId: "user-owner", username: "nova", role: "owner" },
  { userId: "user-manager", username: "stagehand", role: "manager" },
];

const codes: AccessCode[] = [
  {
    id: "code-1",
    page_id: "page-1",
    code_string: "LIVE4FRIDAY",
    duration_days: 30,
    is_redeemed: false,
    redeemed_by_user: null,
    created_at: "2026-09-18T00:00:00.000Z",
  },
];

export default function PreviewPage() {
  if (isSupabaseConfigured()) notFound();

  return (
    <div>
      <CreatorView
        slug="nova-live"
        pageId="page-1"
        displayName="Nova Live"
        bio="Nightly TikTok lives, backstage notes, and the gear fund."
        covers={[]}
        paypalLink="https://www.paypal.com/paypalme"
        followerCount={128}
        isFollowing={false}
        signedIn={false}
        commentAccess={{ signedIn: false, following: false, member: false, viewerId: null }}
        goals={goals}
        categories={categories}
        posts={posts}
        canManage={false}
        notice={null}
      />
      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 pb-20">
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Redeem</h2>
          <RedeemForm />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Posts</h2>
          <PostManager slug="preview" posts={managedPosts} goals={goals} categories={categories} />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Wishlist</h2>
          <GoalManager slug="preview" goals={goals} categories={categories} />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Managers</h2>
          <MemberManager slug="preview" role="owner" members={members} />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Access</h2>
          <AccessManager slug="preview" codes={codes} />
        </section>
      </div>
    </div>
  );
}

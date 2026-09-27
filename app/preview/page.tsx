import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessManager } from "@/components/dashboard/access-manager";
import { GoalManager } from "@/components/dashboard/goal-manager";
import { PostManager } from "@/components/dashboard/post-manager";
import { CreatorView } from "@/components/creator/creator-view";
import { RedeemForm } from "@/components/redeem-form";
import { isSupabaseConfigured } from "@/lib/env";
import type { AccessCode, FeedPost, Goal, ManagedPost } from "@/lib/types";

export const metadata: Metadata = { title: "UI preview" };

const goals: Goal[] = [
  {
    id: "goal-1",
    page_id: "page-1",
    title: "New lighting rig",
    description: "Softboxes and a backup mic for the Friday night show.",
    target_amount: 1600,
    current_amount_raised: 640,
    created_at: "2026-09-01T00:00:00.000Z",
  },
];

const posts: FeedPost[] = [
  {
    id: "post-1",
    page_id: "page-1",
    content: "Friday's set list is up. Come say hey in the first ten minutes.",
    image_url: null,
    is_paywalled: false,
    is_locked: false,
    created_at: "2026-09-20T00:00:00.000Z",
  },
  {
    id: "post-2",
    page_id: "page-1",
    content: null,
    image_url: null,
    is_paywalled: true,
    is_locked: true,
    created_at: "2026-09-22T00:00:00.000Z",
  },
];

const managedPosts: ManagedPost[] = [
  {
    id: "post-1",
    page_id: "page-1",
    content: "Friday's set list is up.",
    image_url: null,
    is_paywalled: false,
    created_at: "2026-09-20T00:00:00.000Z",
  },
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
        coverImage={null}
        paypalLink="https://www.paypal.com/paypalme"
        followerCount={128}
        isFollowing={false}
        signedIn={false}
        goals={goals}
        posts={posts}
        notice={null}
      />
      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 pb-20">
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Redeem</h2>
          <RedeemForm />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Posts</h2>
          <PostManager slug="preview" posts={managedPosts} />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Goals</h2>
          <GoalManager slug="preview" goals={goals} />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Access</h2>
          <AccessManager slug="preview" codes={codes} />
        </section>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessManager } from "@/components/dashboard/access-manager";
import { DesignManager } from "@/components/dashboard/design-manager";
import { GoalManager } from "@/components/dashboard/goal-manager";
import { MemberManager } from "@/components/dashboard/member-manager";
import { LinksManager } from "@/components/dashboard/links-manager";
import { PageDesignChoice } from "@/components/dashboard/page-design-choice";
import { PageDetailsForm } from "@/components/dashboard/page-forms";
import { PostManager } from "@/components/dashboard/post-manager";
import { FindCreators } from "@/components/home/find-creators";
import { FollowingHome } from "@/components/home/following-home";
import { PostFeed } from "@/components/creator/post-feed";
import { CreatorView } from "@/components/creator/creator-view";
import { PageTheme } from "@/components/creator/page-theme";
import { RedeemForm } from "@/components/redeem-form";
import { isSupabaseConfigured } from "@/lib/env";
import type { AccessCode, CoverImage, CreatorPage, FeedPost, FollowedCreator, Goal, ManagedPost, PageMember, PostImage, WishlistCategory } from "@/lib/types";

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
  {
    id: "cat-shows",
    page_id: "page-1",
    name: "Shows",
    created_at: "2026-08-03T00:00:00.000Z",
  },
];

const goals: Goal[] = [
  {
    id: "goal-1",
    page_id: "page-1",
    category_ids: ["cat-gear", "cat-studio"],
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
    category_ids: ["cat-shows"],
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
    title: "Long climb",
    content: "Long climb today. The saddle is finished and the bell barely rings.",
    image_url: null,
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
    reactions: [
      { emoji: "heart", count: 4 },
      { emoji: "fire", count: 2 },
      { emoji: "clap", count: 1 },
    ],
    viewerReactions: ["heart"],
    is_paywalled: false,
    is_locked: false,
    image_count: 2,
    images: [swatch("Climb", "#8a4b2f", "#1c120c"), swatch("Ridge", "#c47a45", "#3a2418")],
    created_at: "2026-09-20T00:00:00.000Z",
  },
  {
    id: "post-2",
    page_id: "page-1",
    title: null,
    content: null,
    image_url: null,
    images: [swatch("Members", "#243044", "#101820")],
    goals: [],
    comments: [],
    reactions: [],
    viewerReactions: [],
    is_paywalled: true,
    is_locked: true,
    image_count: 1,
    created_at: "2026-09-22T00:00:00.000Z",
  },
];

const managedPosts: ManagedPost[] = [
  {
    id: "post-1",
    page_id: "page-1",
    title: "Long climb",
    content: "Long climb today.",
    image_url: null,
    images: [],
    goals: [
      { id: "goal-1", title: "New saddle" },
      { id: "goal-2", title: "New bell" },
    ],
    comment_count: 2,
    reactions: [
      { emoji: "heart", count: 4 },
      { emoji: "fire", count: 2 },
      { emoji: "clap", count: 1 },
    ],
    is_paywalled: false,
    is_draft: false,
    created_at: "2026-09-20T00:00:00.000Z",
  },
  {
    id: "post-2",
    page_id: "page-1",
    title: "Descent notes",
    content: "Members-only note from the descent.",
    image_url: null,
    images: [],
    goals: [],
    comment_count: 0,
    reactions: [{ emoji: "fire", count: 6 }],
    is_paywalled: true,
    is_draft: true,
    created_at: "2026-09-22T18:30:00.000Z",
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

const previewPage: CreatorPage = {
  id: "page-1",
  slug: "nova-live",
  display_name: "Nova Live",
  bio: "Nightly TikTok lives, backstage notes, and the gear fund.",
  cover_image: null,
  paypal_link: "https://www.paypal.com/paypalme/novalive",
  palette: "ember",
  font: "editorial",
  icon_set: "brand",
  links: {
    website: "https://nova.example",
    tiktok: "https://www.tiktok.com/@novalive",
    instagram: "https://www.instagram.com/novalive",
    x: "https://x.com/novalive",
    youtube: "https://www.youtube.com/@novalive",
    whatsapp: "https://wa.me/15555550100",
  },
  links_order: ["youtube", "tiktok", "instagram", "x", "whatsapp", "website"],
  created_at: "2026-08-01T00:00:00.000Z",
};

function swatch(label: string, from: string, to: string): PostImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="40" y="196" fill="white" font-size="64" font-family="Georgia,serif">${label}</text></svg>`;
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, width: 640, height: 360 };
}

const previewCovers: CoverImage[] = [
  { id: "cover-1", ...swatch("Night", "#5c3317", "#1a120c"), storage_path: null },
  { id: "cover-2", ...swatch("Stage", "#1e3a5f", "#0d1520"), storage_path: null },
];

function FollowingPreview() {
  const nova = swatch("Nova", "#5c3317", "#1a120c");
  const ridge = swatch("Ridge", "#1e3a5f", "#0d1520");
  const creators: FollowedCreator[] = [
    { id: "page-1", slug: "nova-live", displayName: "Nova Live", avatarUrl: nova.url, unseenCount: 3 },
    { id: "page-2", slug: "ridge-notes", displayName: "Ridge Notes", avatarUrl: ridge.url, unseenCount: 1 },
    { id: "page-3", slug: "quiet-booth", displayName: "Quiet Booth", avatarUrl: null, unseenCount: 0 },
  ].sort((a, b) => {
    const latest = (id: string) => {
      if (id === "page-1") return posts[1].created_at;
      if (id === "page-2") return posts[0].created_at;
      return "";
    };
    return latest(b.id).localeCompare(latest(a.id));
  });
  const feed: FeedPost[] = [
    {
      ...posts[1],
      unseen: true,
      creator: {
        slug: "nova-live",
        displayName: "Nova Live",
        avatarUrl: nova.url,
        paypalLink: "https://www.paypal.com/paypalme/novalive",
      },
    },
    {
      ...posts[0],
      page_id: "page-2",
      unseen: true,
      creator: {
        slug: "ridge-notes",
        displayName: "Ridge Notes",
        avatarUrl: ridge.url,
        paypalLink: null,
      },
    },
  ];

  return (
    <div className="border-b border-foreground/10 bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16">
        <div className="mb-6 space-y-2">
          <p className="text-sm tracking-[0.2em] text-primary uppercase">Your feed</p>
          <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-6xl">Following</h1>
        </div>
        <FollowingHome creators={creators}>
          <PostFeed
            posts={feed}
            paypalLink={null}
            slug=""
            access={{ signedIn: true, following: true, member: false, viewerId: "preview" }}
            canManage={false}
            goals={[]}
            categories={[]}
            showJumpStrip={false}
          />
        </FollowingHome>
      </div>
      <FindCreators query="nova" results={[{ id: "page-1", slug: "nova-live", displayName: "Nova Live", bio: "Nightly lives and the gear fund.", avatarUrl: nova.url }]} />
    </div>
  );
}

export default function PreviewPage() {
  if (isSupabaseConfigured()) notFound();

  return (
    <div>
      <FollowingPreview />
      <PageTheme palette="ember" font="editorial">
        <CreatorView
        slug="nova-live"
        pageId="page-1"
        displayName="Nova Live"
        bio="Nightly TikTok lives, backstage notes, and the gear fund."
        covers={[swatch("Night", "#5c3317", "#1a120c"), swatch("Stage", "#1e3a5f", "#0d1520")]}
        paypalLink="https://www.paypal.com/paypalme/novalive"
        followerCount={128}
        links={previewPage.links}
        linksOrder={previewPage.links_order}
        iconSet={previewPage.icon_set}
        isFollowing={false}
        signedIn={false}
        commentAccess={{ signedIn: false, following: false, member: false, viewerId: null }}
        goals={goals}
        categories={categories}
        posts={posts}
        canManage={false}
        notice={null}
      />
      </PageTheme>
      <PageDesignChoice palette="ember" font="editorial">
      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 pb-20">
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Details</h2>
          <PageDetailsForm page={previewPage} covers={previewCovers} />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Links</h2>
          <LinksManager
            slug="nova-live"
            links={previewPage.links}
            linksOrder={previewPage.links_order}
            iconSet={previewPage.icon_set}
            palette="ember"
            font="editorial"
          />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-3xl">Design</h2>
          <DesignManager
            slug="nova-live"
            displayName="Nova Live"
            bio="Nightly TikTok lives, backstage notes, and the gear fund."
            palette="ember"
            font="editorial"
          />
        </section>
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
      </PageDesignChoice>
    </div>
  );
}

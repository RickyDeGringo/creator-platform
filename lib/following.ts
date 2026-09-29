import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { httpsUrl } from "@/lib/format";
import { reactionCountsFor, reactionsUnavailable, viewerReactionsFor } from "@/lib/reactions";
import { commentThreads, toFeedPost } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";
import type { CreatorMatch, FeedPost, FollowedCreator, Viewer } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

const FEED_LIMIT = 40;

export type FollowingHome =
  | { status: "unconfigured" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "empty"; viewer: Viewer }
  | { status: "ok"; viewer: Viewer; creators: FollowedCreator[]; posts: FeedPost[] };

function record(value: unknown) {
  return value as Record<string, unknown>;
}

function countOf(value: unknown) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.floor(count);
}

function toFollowedCreator(value: unknown): FollowedCreator | null {
  const row = record(value);
  if (row.id == null || row.slug == null || row.display_name == null) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    avatarUrl: httpsUrl(row.avatar_url == null ? null : String(row.avatar_url)),
    unseenCount: countOf(row.unseen_count),
  };
}

function toFollowingPost(value: unknown): FeedPost | null {
  const row = record(value);
  if (row.slug == null || row.display_name == null) return null;
  const post = toFeedPost(value);
  return {
    ...post,
    unseen: Boolean(row.is_unseen),
    creator: {
      slug: String(row.slug),
      displayName: String(row.display_name),
      avatarUrl: httpsUrl(row.avatar_url == null ? null : String(row.avatar_url)),
      paypalLink: httpsUrl(row.paypal_link == null ? null : String(row.paypal_link)),
    },
  };
}

export const loadFollowingHome = cache(async (): Promise<FollowingHome> => {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const viewer = await getViewer();
  if (!viewer) return { status: "signed_out" };

  const supabase = await createClient();
  const [creatorsResult, feedResult] = await Promise.all([
    supabase.rpc("get_followed_creators"),
    supabase.rpc("get_following_feed", { p_limit: FEED_LIMIT }),
  ]);

  if (creatorsResult.error) return { status: "error", message: creatorsResult.error.message };
  if (feedResult.error) return { status: "error", message: feedResult.error.message };

  const creators = (creatorsResult.data ?? []).flatMap((row: unknown) => {
    const creator = toFollowedCreator(row);
    return creator ? [creator] : [];
  });

  if (creators.length === 0) return { status: "empty", viewer };

  const posts: FeedPost[] = (feedResult.data ?? []).flatMap((row: unknown) => {
    const post = toFollowingPost(row);
    return post ? [post] : [];
  });

  const unlockedIds = posts.filter((post) => !post.is_locked).map((post) => post.id);
  if (unlockedIds.length === 0) return { status: "ok", viewer, creators, posts };

  const [commentsResult, reactionsResult, mineResult] = await Promise.all([
    supabase
      .from("comments")
      .select(
        "id, post_id, parent_id, body, created_at, user_id, author:users(username, tiktok_url, facebook_url, x_url, instagram_url)",
      )
      .in("post_id", unlockedIds)
      .order("created_at", { ascending: true }),
    supabase.from("post_reactions").select("post_id, emoji").in("post_id", unlockedIds),
    supabase.from("post_reactions").select("post_id, emoji").in("post_id", unlockedIds).eq("user_id", viewer.id),
  ]);

  if (commentsResult.error) return { status: "error", message: commentsResult.error.message };
  if (reactionsResult.error && !reactionsUnavailable(reactionsResult.error.message)) {
    return { status: "error", message: reactionsResult.error.message };
  }
  if (mineResult.error && !reactionsUnavailable(mineResult.error.message)) {
    return { status: "error", message: mineResult.error.message };
  }

  const reactionRows = reactionsUnavailable(reactionsResult.error?.message) ? [] : (reactionsResult.data ?? []);
  const mineRows = reactionsUnavailable(mineResult.error?.message) ? [] : (mineResult.data ?? []);

  return {
    status: "ok",
    viewer,
    creators,
    posts: posts.map((post) => {
      if (post.is_locked) return post;
      return {
        ...post,
        comments: commentThreads(commentsResult.data ?? [], post.id),
        reactions: reactionCountsFor(reactionRows, post.id),
        viewerReactions: viewerReactionsFor(mineRows, post.id),
      };
    }),
  };
});

export function creatorSearchTerm(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

export async function searchCreators(raw: string): Promise<{ results: CreatorMatch[]; error?: string }> {
  const term = creatorSearchTerm(raw);
  if (!term) return { results: [] };
  if (!isSupabaseConfigured()) return { results: [], error: "Database not connected." };

  const supabase = await createClient();
  const pattern = `%${term}%`;
  const [bySlug, byName] = await Promise.all([
    supabase.from("creator_pages").select("id, slug, display_name, bio, cover_image").ilike("slug", pattern).limit(12),
    supabase
      .from("creator_pages")
      .select("id, slug, display_name, bio, cover_image")
      .ilike("display_name", pattern)
      .limit(12),
  ]);

  if (bySlug.error) return { results: [], error: bySlug.error.message };
  if (byName.error) return { results: [], error: byName.error.message };

  const merged = new Map<string, Record<string, unknown>>();
  for (const row of [...(bySlug.data ?? []), ...(byName.data ?? [])]) {
    merged.set(String(row.id), row);
  }

  const pages = [...merged.values()];
  const ids = pages.map((row) => String(row.id));
  const covers = new Map<string, string>();
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("cover_images")
      .select("page_id, url, sort_order")
      .in("page_id", ids)
      .order("sort_order", { ascending: true });
    if (error) return { results: [], error: error.message };
    for (const row of data ?? []) {
      const pageId = String(row.page_id);
      if (covers.has(pageId)) continue;
      const url = httpsUrl(row.url == null ? null : String(row.url));
      if (url) covers.set(pageId, url);
    }
  }

  const results = pages.flatMap((row) => {
    const id = String(row.id);
    const slug = String(row.slug ?? "");
    const displayName = String(row.display_name ?? "");
    if (!slug || !displayName) return [];
    const avatar = covers.get(id) ?? httpsUrl(row.cover_image == null ? null : String(row.cover_image));
    return [
      {
        id,
        slug,
        displayName,
        bio: row.bio == null ? null : String(row.bio),
        avatarUrl: avatar,
      },
    ];
  });

  results.sort((a, b) => {
    const aExact = a.slug === term ? 0 : 1;
    const bExact = b.slug === term ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return a.displayName.localeCompare(b.displayName);
  });

  return { results: results.slice(0, 12) };
}

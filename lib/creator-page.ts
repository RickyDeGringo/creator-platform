import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { httpsUrl } from "@/lib/format";
import { commentThreads, toFeedPost, toGoal, toPage, toPostImage } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";
import type { CreatorPage, FeedPost, Goal, PostImage, Viewer } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

export type CreatorPageData = {
  page: CreatorPage;
  covers: PostImage[];
  goals: Goal[];
  posts: FeedPost[];
  followerCount: number;
  isFollowing: boolean;
  isMember: boolean;
  viewer: Viewer | null;
};

export type LoadCreatorResult =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "ok"; data: CreatorPageData };

function coverImages(legacy: string | null, rows: unknown[]): PostImage[] {
  const images = rows.flatMap((row) => {
    const image = toPostImage(row);
    return image ? [image] : [];
  });
  if (images.length > 0) return images;
  const fallback = httpsUrl(legacy);
  return fallback ? [{ url: fallback, width: null, height: null }] : [];
}

export const loadCreatorPage = cache(async (slug: string): Promise<LoadCreatorResult> => {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data: pageRow, error: pageError } = await supabase
    .from("creator_pages")
    .select("id, slug, display_name, bio, cover_image, paypal_link, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (pageError) return { status: "error", message: pageError.message };
  if (!pageRow) return { status: "not_found" };

  const page = toPage(pageRow);
  const viewer = await getViewer();

  const [goalsResult, coversResult, feedResult, commentsResult, countResult, followResult, memberResult] =
    await Promise.all([
    supabase
      .from("goals")
      .select(
        "id, page_id, title, description, link, image_url, image_width, image_height, target_amount, current_amount_raised, created_at",
      )
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cover_images")
      .select("url, width, height, sort_order")
      .eq("page_id", page.id)
      .order("sort_order"),
    supabase.rpc("get_page_feed", { p_page_id: page.id, p_limit: 50 }),
    supabase
      .from("comments")
      .select(
        "id, post_id, parent_id, body, created_at, user_id, author:users(username, tiktok_url, facebook_url, x_url, instagram_url)",
      )
      .eq("page_id", page.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("followers")
      .select("user_id", { count: "exact", head: true })
      .eq("page_id", page.id),
    viewer
      ? supabase
          .from("followers")
          .select("user_id")
          .eq("page_id", page.id)
          .eq("user_id", viewer.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    viewer
      ? supabase
          .from("page_members")
          .select("role")
          .eq("page_id", page.id)
          .eq("user_id", viewer.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (goalsResult.error) return { status: "error", message: goalsResult.error.message };
  if (coversResult.error) return { status: "error", message: coversResult.error.message };
  if (feedResult.error) return { status: "error", message: feedResult.error.message };
  if (commentsResult.error) return { status: "error", message: commentsResult.error.message };
  if (countResult.error) return { status: "error", message: countResult.error.message };
  if (followResult.error) return { status: "error", message: followResult.error.message };
  if (memberResult.error) return { status: "error", message: memberResult.error.message };

  return {
    status: "ok",
    data: {
      page,
      covers: coverImages(page.cover_image, coversResult.data ?? []),
      goals: (goalsResult.data ?? []).map(toGoal),
      posts: (feedResult.data ?? []).map((row: unknown) => {
        const post = toFeedPost(row);
        if (post.is_locked) return post;
        return { ...post, comments: commentThreads(commentsResult.data ?? [], post.id) };
      }),
      followerCount: countResult.count ?? 0,
      isFollowing: Boolean(followResult.data),
      isMember: Boolean(memberResult.data),
      viewer,
    },
  };
});

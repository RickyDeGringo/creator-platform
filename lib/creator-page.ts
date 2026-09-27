import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { toFeedPost, toGoal, toPage } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";
import type { CreatorPage, FeedPost, Goal, Viewer } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

export type CreatorPageData = {
  page: CreatorPage;
  goals: Goal[];
  posts: FeedPost[];
  followerCount: number;
  isFollowing: boolean;
  viewer: Viewer | null;
};

export type LoadCreatorResult =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "ok"; data: CreatorPageData };

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

  const [goalsResult, feedResult, countResult, followResult] = await Promise.all([
    supabase
      .from("goals")
      .select("id, page_id, title, description, link, target_amount, current_amount_raised, created_at")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_page_feed", { p_page_id: page.id, p_limit: 50 }),
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
  ]);

  if (goalsResult.error) return { status: "error", message: goalsResult.error.message };
  if (feedResult.error) return { status: "error", message: feedResult.error.message };
  if (countResult.error) return { status: "error", message: countResult.error.message };
  if (followResult.error) return { status: "error", message: followResult.error.message };

  return {
    status: "ok",
    data: {
      page,
      goals: (goalsResult.data ?? []).map(toGoal),
      posts: (feedResult.data ?? []).map(toFeedPost),
      followerCount: countResult.count ?? 0,
      isFollowing: Boolean(followResult.data),
      viewer,
    },
  };
});

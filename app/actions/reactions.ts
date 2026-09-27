"use server";

import { revalidatePath } from "next/cache";
import { isReactionEmoji } from "@/lib/reactions";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
}

export async function toggleReaction(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to react." };

  const postId = String(formData.get("postId") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!UUID.test(postId)) return { error: "That post is not available." };
  if (!isReactionEmoji(emoji)) return { error: "Choose a reaction." };

  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, page_id")
    .eq("id", postId)
    .maybeSingle();
  if (postError) return { error: friendlyDbError(postError.message) };
  if (!post) return { error: "Subscribe to react to this post." };

  const { data: existing, error: loadError } = await supabase
    .from("post_reactions")
    .select("emoji")
    .eq("post_id", postId)
    .eq("user_id", viewer.id)
    .eq("emoji", emoji)
    .maybeSingle();
  if (loadError) return { error: friendlyDbError(loadError.message) };

  if (existing) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", viewer.id)
      .eq("emoji", emoji);
    if (error) return { error: friendlyDbError(error.message) };
    refresh(slug);
    return null;
  }

  const { error } = await supabase.from("post_reactions").insert({
    post_id: postId,
    page_id: post.page_id,
    user_id: viewer.id,
    emoji,
  });
  if (error) {
    if (error.message.includes("23505") || error.message.includes("duplicate key")) {
      refresh(slug);
      return null;
    }
    return { error: friendlyDbError(error.message) };
  }

  refresh(slug);
  return null;
}

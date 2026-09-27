"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
}

export async function createComment(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to comment." };

  const postId = String(formData.get("postId") ?? "");
  const parentRaw = String(formData.get("parentId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(postId)) return { error: "That post is not available." };
  if (parentRaw && !/^[0-9a-f-]{36}$/i.test(parentRaw)) return { error: "Reply to the original comment." };
  if (body.length < 1) return { error: "Write a comment first." };
  if (body.length > 1000) return { error: "Comments can be up to 1000 characters." };

  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, page_id")
    .eq("id", postId)
    .maybeSingle();

  if (postError) return { error: friendlyDbError(postError.message) };
  if (!post) return { error: "Subscribe to comment on this post." };

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    page_id: post.page_id,
    user_id: viewer.id,
    parent_id: parentRaw || null,
    body,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: parentRaw ? "Reply posted." : "Comment posted." };
}

export async function deleteComment(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to remove a comment." };

  const commentId = String(formData.get("commentId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(commentId)) return { error: "That comment is already gone." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id");
  if (error) return { error: friendlyDbError(error.message) };
  if (!data || data.length === 0) return { error: "That comment is already gone." };

  refresh(slug);
  return { success: "Comment removed." };
}

"use server";

import { revalidatePath } from "next/cache";
import { httpsUrl } from "@/lib/format";
import { getStaffPage } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
}

export async function createPost(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const content = String(formData.get("content") ?? "").trim();
  const imageRaw = String(formData.get("image_url") ?? "").trim();
  const imageUrl = imageRaw ? httpsUrl(imageRaw) : null;
  const isPaywalled = formData.get("is_paywalled") === "on";

  if (content.length > 5000) return { error: "Posts are limited to 5000 characters." };
  if (imageRaw && !imageUrl) return { error: "Image URL must start with https://." };
  if (!content && !imageUrl) return { error: "Add text or an image URL." };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").insert({
    page_id: access.page.id,
    content: content || null,
    image_url: imageUrl,
    is_paywalled: isPaywalled,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: isPaywalled ? "Paywalled post published." : "Post published." };
}

export async function deletePost(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const postId = String(formData.get("postId") ?? "");
  if (!postId) return { error: "Missing post." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("page_id", access.page.id);

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: "Post deleted." };
}

"use server";

import { revalidatePath } from "next/cache";
import { httpsUrl } from "@/lib/format";
import { PHOTO_MAX_COUNT, PHOTO_UPLOAD_MAX_BYTES } from "@/lib/photo-frame";
import { PhotoError, processPhoto } from "@/lib/process-photo";
import { getStaffPage } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";

const BUCKET = "post-media";
const MAX_GOALS = 6;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
}

function photoFiles(formData: FormData) {
  return formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function goalIdsFromForm(formData: FormData) {
  const ids = formData
    .getAll("goal_ids")
    .map((value) => String(value).trim())
    .filter((value) => UUID.test(value));
  return [...new Set(ids)];
}

function optionalHttps(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return { url: null as string | null };
  const url = httpsUrl(raw);
  if (!url || url.length > 2000) return { error: "Image URL must start with https://." };
  return { url };
}

function storageError(message: string) {
  if (/maximum|exceeded|too large|payload/i.test(message)) {
    return "That photo is still too large. Try a smaller one.";
  }
  if (/bucket|row-level security|not authorized|permission|post-media/i.test(message)) {
    return "Photo uploads are not ready yet. Apply the latest Supabase migration, then try again.";
  }
  return "Could not save those photos. Try again.";
}

export async function createPost(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const content = String(formData.get("content") ?? "").trim();
  const image = optionalHttps(formData.get("image_url"));
  if ("error" in image) return { error: image.error };
  const imageUrl = image.url;
  const isPaywalled = formData.get("is_paywalled") === "on";
  const photos = photoFiles(formData);
  const goalIds = goalIdsFromForm(formData);

  if (content.length > 5000) return { error: "Posts are limited to 5000 characters." };
  if (photos.length + (imageUrl ? 1 : 0) > PHOTO_MAX_COUNT) {
    return { error: `A post can show ${PHOTO_MAX_COUNT} images.` };
  }
  if (photos.some((photo) => photo.size > PHOTO_UPLOAD_MAX_BYTES)) {
    return { error: "That photo is still too large after resizing." };
  }
  if (goalIds.length > MAX_GOALS) return { error: "Attach up to 6 wishlist items." };
  if (!content && !imageUrl && photos.length === 0) return { error: "Add text, a photo, or an image URL." };
  const published = publishedInstant(formData.get("published_at"), formData.get("timezone_offset"));
  if ("error" in published) return { error: published.error };

  const supabase = await createClient();

  if (goalIds.length > 0) {
    const { data, error } = await supabase.from("goals").select("id").eq("page_id", access.page.id).in("id", goalIds);
    if (error) return { error: friendlyDbError(error.message) };
    const found = new Set((data ?? []).map((row) => String(row.id)));
    if (goalIds.some((id) => !found.has(id))) return { error: "Choose wishlist items from this page." };
  }

  let prepared: { buffer: Buffer; width: number; height: number }[] = [];
  try {
    prepared = await Promise.all(
      photos.map(async (photo) => processPhoto(Buffer.from(await photo.arrayBuffer()))),
    );
  } catch (error) {
    if (error instanceof PhotoError) return { error: error.message };
    console.error(error);
    return { error: "Could not process that photo. Use a JPEG, PNG, WebP, or GIF." };
  }

  const uploaded: { path: string; url: string; width: number; height: number }[] = [];
  const removeUploads = async () => {
    if (uploaded.length === 0) return;
    await supabase.storage.from(BUCKET).remove(uploaded.map((photo) => photo.path));
  };

  for (const photo of prepared) {
    const path = `${access.page.id.toLowerCase()}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, photo.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) {
      await removeUploads();
      return { error: storageError(uploadError.message) };
    }
    const savedUrl = httpsUrl(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    if (!savedUrl) {
      uploaded.push({ path, url: "", width: photo.width, height: photo.height });
      await removeUploads();
      return { error: "Could not save those photos. Try again." };
    }
    uploaded.push({ path, url: savedUrl, width: photo.width, height: photo.height });
  }

  const cover = uploaded[0]?.url ?? imageUrl;
  const { data: inserted, error: insertError } = await supabase
    .from("posts")
    .insert({
      page_id: access.page.id,
      content: content || null,
      image_url: cover,
      is_paywalled: isPaywalled,
      created_at: published.at,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await removeUploads();
    return { error: friendlyDbError(insertError?.message ?? "Could not publish that post.") };
  }

  const postId = String(inserted.id);
  const discard = async () => {
    await supabase.from("posts").delete().eq("id", postId).eq("page_id", access.page.id);
    await removeUploads();
  };

  const imageRows = [
    ...uploaded.map((photo, index) => ({
      post_id: postId,
      page_id: access.page.id,
      url: photo.url,
      storage_path: photo.path,
      width: photo.width,
      height: photo.height,
      sort_order: index,
    })),
    ...(imageUrl
      ? [
          {
            post_id: postId,
            page_id: access.page.id,
            url: imageUrl,
            storage_path: null,
            width: null,
            height: null,
            sort_order: uploaded.length,
          },
        ]
      : []),
  ];

  if (imageRows.length > 0) {
    const { error } = await supabase.from("post_images").insert(imageRows);
    if (error) {
      await discard();
      return { error: friendlyDbError(error.message) };
    }
  }

  if (goalIds.length > 0) {
    const { error } = await supabase.from("post_goals").insert(
      goalIds.map((goalId, index) => ({
        post_id: postId,
        goal_id: goalId,
        sort_order: index,
      })),
    );
    if (error) {
      await discard();
      return { error: friendlyDbError(error.message) };
    }
  }

  refresh(slug);
  return { success: isPaywalled ? "Paywalled post published." : "Post published." };
}

function publishedInstant(value: FormDataEntryValue | null, offsetValue: FormDataEntryValue | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return { error: "Pick a published date and time." };
  const offset = Number(String(offsetValue ?? "").trim());
  if (!Number.isInteger(offset) || offset < -14 * 60 || offset > 14 * 60) {
    return { error: "Pick a published date and time." };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (hour > 23 || minute > 59) return { error: "Pick a published date and time." };

  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    wall.getUTCFullYear() !== year ||
    wall.getUTCMonth() !== month - 1 ||
    wall.getUTCDate() !== day ||
    wall.getUTCHours() !== hour ||
    wall.getUTCMinutes() !== minute
  ) {
    return { error: "Pick a published date and time." };
  }
  if (year < 2000) return { error: "Pick a published date from 2000 onward." };

  const at = new Date(wall.getTime() + offset * 60 * 1000);
  if (at.getTime() > Date.now() + 5 * 60 * 1000) return { error: "Published time can't be in the future." };
  return { at: at.toISOString() };
}

export async function updatePost(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const postId = String(formData.get("postId") ?? "");
  if (!UUID.test(postId)) return { error: "Missing post." };

  const content = String(formData.get("content") ?? "").trim();
  if (content.length > 5000) return { error: "Posts are limited to 5000 characters." };
  const published = publishedInstant(formData.get("published_at"), formData.get("timezone_offset"));
  if ("error" in published) return { error: published.error };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("posts")
    .select("id, image_url")
    .eq("id", postId)
    .eq("page_id", access.page.id)
    .maybeSingle();
  if (loadError) return { error: friendlyDbError(loadError.message) };
  if (!existing) return { error: "That post is gone." };
  if (!content && !existing.image_url) return { error: "Add text, or keep a photo on the post." };

  const { error } = await supabase
    .from("posts")
    .update({
      content: content || null,
      created_at: published.at,
    })
    .eq("id", postId)
    .eq("page_id", access.page.id);
  if (error) return { error: friendlyDbError(error.message) };

  const goalError = await replacePostGoals(supabase, access.page.id, postId, goalIdsFromForm(formData));
  refresh(slug);
  if (goalError) return { error: goalError };
  return { success: "Post updated." };
}

async function replacePostGoals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pageId: string,
  postId: string,
  goalIds: string[],
) {
  if (goalIds.length > MAX_GOALS) return "Attach up to 6 wishlist items.";
  if (goalIds.length > 0) {
    const { data, error } = await supabase.from("goals").select("id").eq("page_id", pageId).in("id", goalIds);
    if (error) return friendlyDbError(error.message);
    const found = new Set((data ?? []).map((row) => String(row.id)));
    if (goalIds.some((id) => !found.has(id))) return "Choose wishlist items from this page.";
  }

  const { data: previous, error: loadError } = await supabase
    .from("post_goals")
    .select("goal_id, sort_order")
    .eq("post_id", postId);
  if (loadError) return friendlyDbError(loadError.message);

  const { error: deleteError } = await supabase.from("post_goals").delete().eq("post_id", postId);
  if (deleteError) return friendlyDbError(deleteError.message);

  if (goalIds.length === 0) return null;

  const { error: insertError } = await supabase.from("post_goals").insert(
    goalIds.map((goalId, index) => ({
      post_id: postId,
      goal_id: goalId,
      sort_order: index,
    })),
  );
  if (!insertError) return null;

  const restore = (previous ?? []).flatMap((row) => {
    const goalId = String(row.goal_id ?? "");
    if (!UUID.test(goalId)) return [];
    return [{ post_id: postId, goal_id: goalId, sort_order: Number(row.sort_order) || 0 }];
  });
  if (restore.length > 0) await supabase.from("post_goals").insert(restore);
  return friendlyDbError(insertError.message);
}

export async function deletePost(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const postId = String(formData.get("postId") ?? "");
  if (!UUID.test(postId)) return { error: "Missing post." };

  const supabase = await createClient();
  const { data: images } = await supabase
    .from("post_images")
    .select("storage_path")
    .eq("post_id", postId)
    .eq("page_id", access.page.id);

  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("page_id", access.page.id);
  if (error) return { error: friendlyDbError(error.message) };

  const paths = (images ?? [])
    .map((image) => (image.storage_path == null ? "" : String(image.storage_path)))
    .filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  refresh(slug);
  return { success: "Post deleted." };
}

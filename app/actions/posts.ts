"use server";

import { revalidatePath } from "next/cache";
import { httpsUrl } from "@/lib/format";
import { PHOTO_MAX_BYTES, PHOTO_MAX_COUNT } from "@/lib/photo-frame";
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
  if (photos.some((photo) => photo.size > PHOTO_MAX_BYTES)) return { error: "Each photo must be under 12 MB." };
  if (goalIds.length > MAX_GOALS) return { error: "Attach up to 6 goals." };
  if (!content && !imageUrl && photos.length === 0) return { error: "Add text, a photo, or an image URL." };

  const supabase = await createClient();

  if (goalIds.length > 0) {
    const { data, error } = await supabase.from("goals").select("id").eq("page_id", access.page.id).in("id", goalIds);
    if (error) return { error: friendlyDbError(error.message) };
    const found = new Set((data ?? []).map((row) => String(row.id)));
    if (goalIds.some((id) => !found.has(id))) return { error: "Choose goals from this page." };
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

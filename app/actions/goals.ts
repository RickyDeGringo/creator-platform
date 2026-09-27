"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { httpsUrl } from "@/lib/format";
import { getStaffPage } from "@/lib/staff";
import { photoFiles, removeStored, storePhotos } from "@/lib/store-photos";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError, MAX_GOAL_TAGS, parseAmount } from "@/lib/validators";

const CATEGORY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function categoriesForPage(
  supabase: SupabaseClient,
  pageId: string,
  formData: FormData,
): Promise<{ error: string } | { categoryIds: string[] }> {
  const categoryIds = [...new Set(formData.getAll("category_ids").map((value) => String(value).trim()).filter(Boolean))];
  if (categoryIds.length > MAX_GOAL_TAGS) return { error: "A goal can have 8 tags." };
  if (categoryIds.some((id) => !CATEGORY_ID.test(id))) return { error: "Choose tags from this page." };
  if (categoryIds.length === 0) return { categoryIds };

  const { data, error } = await supabase
    .from("wishlist_categories")
    .select("id")
    .eq("page_id", pageId)
    .in("id", categoryIds);

  if (error) return { error: friendlyDbError(error.message) };
  const found = new Set((data ?? []).map((row) => String(row.id)));
  if (categoryIds.some((id) => !found.has(id))) return { error: "Choose tags from this page." };
  return { categoryIds };
}

async function replaceGoalTags(
  supabase: SupabaseClient,
  goalId: string,
  categoryIds: string[],
): Promise<string | null> {
  const { data: previous, error: loadError } = await supabase
    .from("goal_categories")
    .select("category_id")
    .eq("goal_id", goalId);
  if (loadError) return friendlyDbError(loadError.message);

  const { error: deleteError } = await supabase.from("goal_categories").delete().eq("goal_id", goalId);
  if (deleteError) return friendlyDbError(deleteError.message);
  if (categoryIds.length === 0) return null;

  const { error: insertError } = await supabase.from("goal_categories").insert(
    categoryIds.map((categoryId) => ({ goal_id: goalId, category_id: categoryId })),
  );
  if (!insertError) return null;

  const restore = (previous ?? []).flatMap((row) => {
    const categoryId = String(row.category_id ?? "");
    if (!CATEGORY_ID.test(categoryId)) return [];
    return [{ goal_id: goalId, category_id: categoryId }];
  });
  if (restore.length > 0) await supabase.from("goal_categories").insert(restore);
  return friendlyDbError(insertError.message);
}

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
}

async function goalPhoto(
  supabase: SupabaseClient,
  pageId: string,
  formData: FormData,
  previousPath: string | null,
): Promise<{ error: string } | { image: { url: string; path: string; width: number; height: number } | null } | { unchanged: true }> {
  const files = photoFiles(formData);
  if (files.length > 1) return { error: "A goal can show one photo." };
  const remove = formData.get("remove_image") != null;
  if (files.length === 0 && !remove) return { unchanged: true };

  if (files.length === 1) {
    const stored = await storePhotos(supabase, pageId, "goals", files);
    if ("error" in stored) return { error: stored.error };
    const photo = stored.photos[0];
    if (!photo) return { error: "Could not prepare that photo." };
    if (previousPath && previousPath !== photo.path) await removeStored(supabase, [previousPath]);
    return { image: { url: photo.url, path: photo.path, width: photo.width, height: photo.height } };
  }

  if (previousPath) await removeStored(supabase, [previousPath]);
  return { image: null };
}

function optionalLink(formData: FormData): { error: string } | { link: string | null } {
  const raw = String(formData.get("link") ?? "").trim();
  if (!raw) return { link: null };
  const link = httpsUrl(raw);
  if (!link || link.length > 2000) return { error: "Goal link must start with https://." };
  return { link };
}

export async function createGoal(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const linked = optionalLink(formData);
  if ("error" in linked) return { error: linked.error };
  const target = parseAmount(formData.get("target_amount"));

  if (title.length < 1 || title.length > 120) return { error: "Title must be 1–120 characters." };
  if (description.length > 1000) return { error: "Keep the description under 1000 characters." };
  if (target == null || target <= 0) return { error: "Enter a target amount greater than 0." };

  const files = photoFiles(formData);
  if (files.length > 1) return { error: "A goal can show one photo." };

  const supabase = await createClient();
  const category = await categoriesForPage(supabase, access.page.id, formData);
  if ("error" in category) return { error: category.error };

  const { data: created, error } = await supabase
    .from("goals")
    .insert({
      page_id: access.page.id,
      title,
      description: description || null,
      link: linked.link,
      target_amount: target,
      current_amount_raised: 0,
    })
    .select("id")
    .single();

  if (error || !created) return { error: friendlyDbError(error?.message ?? "Could not create that goal.") };

  const tagsError = await replaceGoalTags(supabase, created.id, category.categoryIds);
  if (tagsError) {
    await supabase.from("goals").delete().eq("id", created.id);
    return { error: tagsError };
  }

  if (files.length === 1) {
    const photo = await goalPhoto(supabase, access.page.id, formData, null);
    if ("error" in photo) {
      await supabase.from("goals").delete().eq("id", created.id);
      return { error: photo.error };
    }
    if ("image" in photo && photo.image) {
      const { error: imageError } = await supabase
        .from("goals")
        .update({
          image_url: photo.image.url,
          image_storage_path: photo.image.path,
          image_width: photo.image.width,
          image_height: photo.image.height,
        })
        .eq("id", created.id);
      if (imageError) {
        await removeStored(supabase, [photo.image.path]);
        await supabase.from("goals").delete().eq("id", created.id);
        return { error: friendlyDbError(imageError.message) };
      }
    }
  }

  refresh(slug);
  return { success: "Goal created." };
}

export async function updateGoal(
  slug: string,
  goalId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const amount = parseAmount(formData.get("current_amount_raised"));
  if (amount == null) return { error: "Enter the amount raised, using numbers only." };
  const linked = optionalLink(formData);
  if ("error" in linked) return { error: linked.error };

  const supabase = await createClient();
  const { data: current, error: loadError } = await supabase
    .from("goals")
    .select("image_storage_path")
    .eq("id", goalId)
    .eq("page_id", access.page.id)
    .maybeSingle();
  if (loadError) return { error: friendlyDbError(loadError.message) };
  if (!current) return { error: "That goal is not on this page." };

  const category = await categoriesForPage(supabase, access.page.id, formData);
  if ("error" in category) return { error: category.error };

  const photo = await goalPhoto(supabase, access.page.id, formData, current.image_storage_path);
  if ("error" in photo) return { error: photo.error };

  const patch: {
    current_amount_raised: number;
    link: string | null;
    image_url?: string | null;
    image_storage_path?: string | null;
    image_width?: number | null;
    image_height?: number | null;
  } = { current_amount_raised: amount, link: linked.link };

  if ("image" in photo) {
    patch.image_url = photo.image?.url ?? null;
    patch.image_storage_path = photo.image?.path ?? null;
    patch.image_width = photo.image?.width ?? null;
    patch.image_height = photo.image?.height ?? null;
  }

  const { error } = await supabase.from("goals").update(patch).eq("id", goalId).eq("page_id", access.page.id);

  if (error) return { error: friendlyDbError(error.message) };
  const tagsError = await replaceGoalTags(supabase, goalId, category.categoryIds);
  if (tagsError) return { error: tagsError };
  refresh(slug);
  return { success: "Goal updated." };
}

export async function deleteGoal(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { error: "Missing goal." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("goals")
    .select("image_storage_path")
    .eq("id", goalId)
    .eq("page_id", access.page.id)
    .maybeSingle();

  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("page_id", access.page.id);
  if (error) return { error: friendlyDbError(error.message) };
  if (current?.image_storage_path) await removeStored(supabase, [current.image_storage_path]);

  refresh(slug);
  return { success: "Goal deleted." };
}

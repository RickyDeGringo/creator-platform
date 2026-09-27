"use server";

import { revalidatePath } from "next/cache";
import { getStaffPage } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { categoryNameError, friendlyDbError, normalizeCategoryName } from "@/lib/validators";

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
}

function categoryId(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return id;
}

export async function createWishlistCategory(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const name = normalizeCategoryName(String(formData.get("name") ?? ""));
  const nameError = categoryNameError(name);
  if (nameError) return { error: nameError };

  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_categories").insert({
    page_id: access.page.id,
    name,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: "Category added." };
}

export async function renameWishlistCategory(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const id = categoryId(formData);
  if (!id) return { error: "Missing category." };

  const name = normalizeCategoryName(String(formData.get("name") ?? ""));
  const nameError = categoryNameError(name);
  if (nameError) return { error: nameError };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlist_categories")
    .update({ name })
    .eq("id", id)
    .eq("page_id", access.page.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: friendlyDbError(error.message) };
  if (!data) return { error: "That category is not on this page." };
  refresh(slug);
  return { success: "Category renamed." };
}

export async function deleteWishlistCategory(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const id = categoryId(formData);
  if (!id) return { error: "Missing category." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wishlist_categories")
    .delete()
    .eq("id", id)
    .eq("page_id", access.page.id);

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: "Category removed. Items in it stay on the wishlist." };
}

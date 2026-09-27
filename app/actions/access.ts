"use server";

import { revalidatePath } from "next/cache";
import { formatDate } from "@/lib/format";
import { getStaffPage } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError, parseDuration, usernameError } from "@/lib/validators";

function refresh(slug: string) {
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/${slug}`);
}

export async function createAccessCode(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const duration = parseDuration(formData.get("duration_days"));
  if (!duration) return { error: "Choose 7, 30, or 90 days." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_access_code", {
    p_page_id: access.page.id,
    p_duration_days: duration,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return {
    success: `New ${duration}-day code is ready. It can be redeemed once.`,
    code: typeof data === "string" ? data : undefined,
  };
}

export async function grantAccess(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const nameError = usernameError(username);
  if (nameError) return { error: nameError };

  const duration = parseDuration(formData.get("duration_days"));
  if (!duration) return { error: "Choose 7, 30, or 90 days." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("grant_page_access", {
    p_page_id: access.page.id,
    p_username: username,
    p_duration_days: duration,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  const expires = typeof data === "string" ? formatDate(data) : null;
  return {
    success: expires
      ? `@${username} has access through ${expires}.`
      : `@${username} now has access.`,
  };
}

export async function deleteAccessCode(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const codeId = String(formData.get("codeId") ?? "");
  if (!codeId) return { error: "Missing code." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("access_codes")
    .delete()
    .eq("id", codeId)
    .eq("page_id", access.page.id)
    .eq("is_redeemed", false);

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: "Unused code deleted." };
}

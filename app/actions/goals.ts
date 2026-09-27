"use server";

import { revalidatePath } from "next/cache";
import { getStaffPage } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError, parseAmount } from "@/lib/validators";

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
}

export async function createGoal(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const target = parseAmount(formData.get("target_amount"));

  if (title.length < 1 || title.length > 120) return { error: "Title must be 1–120 characters." };
  if (description.length > 1000) return { error: "Keep the description under 1000 characters." };
  if (target == null || target <= 0) return { error: "Enter a target amount greater than 0." };

  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    page_id: access.page.id,
    title,
    description: description || null,
    target_amount: target,
    current_amount_raised: 0,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: "Goal created." };
}

export async function updateGoalAmount(
  slug: string,
  goalId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const amount = parseAmount(formData.get("current_amount_raised"));
  if (amount == null) return { error: "Enter the amount raised, using numbers only." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ current_amount_raised: amount })
    .eq("id", goalId)
    .eq("page_id", access.page.id);

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  return { success: "Amount updated." };
}

export async function deleteGoal(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { error: "Missing goal." };

  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("page_id", access.page.id);
  if (error) return { error: friendlyDbError(error.message) };

  refresh(slug);
  return { success: "Goal deleted." };
}

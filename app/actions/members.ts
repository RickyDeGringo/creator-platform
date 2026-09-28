"use server";

import { revalidatePath } from "next/cache";
import { getStaffPage } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { emailError, friendlyDbError } from "@/lib/validators";

function refresh(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/${slug}`);
}

export async function addPageManager(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };
  if (access.role !== "owner") return { error: "Only the page owner can add or remove managers." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const invalid = emailError(email);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_page_manager", {
    p_page_id: access.page.id,
    p_email: email,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  const username = typeof data === "string" ? data : null;
  return {
    success: username
      ? `@${username} can now manage this page.`
      : `${email} can now manage this page.`,
  };
}

export async function transferPageOwnership(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };
  if (access.role !== "owner") return { error: "Only the page owner can transfer this page." };

  const userId = String(formData.get("userId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { error: "Choose a manager on this page." };
  }
  if (userId === access.userId) return { error: "Ownership can only move to a manager of this page." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("transfer_page_ownership", {
    p_page_id: access.page.id,
    p_user_id: userId,
  });

  if (error) return { error: friendlyDbError(error.message) };
  refresh(slug);
  const username = typeof data === "string" ? data : null;
  return {
    success: username
      ? `@${username} is now the owner. You are a manager.`
      : "Ownership transferred. You are a manager.",
  };
}

export async function removePageManager(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };
  if (access.role !== "owner") return { error: "Only the page owner can add or remove managers." };

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Missing manager." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("page_members")
    .delete()
    .eq("page_id", access.page.id)
    .eq("user_id", userId)
    .eq("role", "manager")
    .select("user_id");

  if (error) return { error: friendlyDbError(error.message) };
  if (!data || data.length === 0) return { error: "That manager was not found." };
  refresh(slug);
  return { success: "Manager removed." };
}

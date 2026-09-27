"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

export async function redeemCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local." };
  }

  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to redeem a code." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter an access code." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_access_code", { p_code: code });
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath("/redeem");
  const expires = typeof data === "string" ? formatDate(data) : null;
  return {
    success: expires
      ? `Access is active through ${expires}.`
      : "Access code redeemed.",
  };
}

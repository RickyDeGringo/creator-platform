"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { socialProfile, type SocialKind } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase URL and anon key to .env.local first." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !nextPassword || !confirmPassword) {
    return { error: "Enter your current password and a new one." };
  }
  if (nextPassword.length < 8) return { error: "Use a password of at least 8 characters." };
  if (nextPassword !== confirmPassword) return { error: "New password and confirmation do not match." };
  if (nextPassword === currentPassword) return { error: "Choose a password that is different from the current one." };

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (userError || !email) return { error: "Sign in to change your password." };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) {
    if (signInError.message.toLowerCase().includes("invalid login")) {
      return { error: "Current password is incorrect." };
    }
    return { error: friendlyDbError(signInError.message) };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });
  if (updateError) return { error: friendlyDbError(updateError.message) };

  return { success: "Password updated. Use the new one next time you sign in." };
}

const SOCIAL_FIELDS: { kind: SocialKind; column: "tiktok_url" | "facebook_url" | "x_url" | "instagram_url" }[] = [
  { kind: "tiktok", column: "tiktok_url" },
  { kind: "facebook", column: "facebook_url" },
  { kind: "x", column: "x_url" },
  { kind: "instagram", column: "instagram_url" },
];

export async function updateSocials(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase URL and anon key to .env.local first." };
  }

  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to update your profiles." };

  const patch: Record<string, string | null> = {};
  for (const field of SOCIAL_FIELDS) {
    const parsed = socialProfile(field.kind, String(formData.get(field.kind) ?? ""));
    if ("error" in parsed) return { error: parsed.error };
    patch[field.column] = parsed.url;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users").update(patch).eq("id", viewer.id);
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath("/profile");
  return { success: "Profiles saved. They show next to your name on comments." };
}

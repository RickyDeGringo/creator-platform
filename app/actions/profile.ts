"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";

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

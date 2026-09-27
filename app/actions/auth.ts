"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError, safeNext, usernameError } from "@/lib/validators";

async function origin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase URL and anon key to .env.local first." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyDbError(error.message) };

  redirect(next);
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase URL and anon key to .env.local first." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? ""));
  const nameError = usernameError(username);

  if (nameError) return { error: nameError };
  if (!email) return { error: "Enter an email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };

  const supabase = await createClient();
  const site = await origin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: site ? `${site}/auth/callback?next=${encodeURIComponent(next)}` : undefined,
    },
  });

  if (error) return { error: friendlyDbError(error.message) };
  if (!data.session) {
    return { success: "Check your email to confirm the account, then sign in." };
  }

  redirect(next);
}

export async function signOut() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

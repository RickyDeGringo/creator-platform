"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { httpsUrl } from "@/lib/format";
import { getStaffPage } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError, normalizeSlug, slugError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

export async function goToPage(formData: FormData) {
  const raw = String(formData.get("slug") ?? "");
  const error = slugError(raw);
  if (error) redirect(`/?error=${encodeURIComponent(error)}`);
  redirect(`/${normalizeSlug(raw)}`);
}

export async function createPage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const rawSlug = String(formData.get("slug") ?? "");
  const invalid = slugError(rawSlug);
  if (invalid) return { error: invalid };

  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const paypalRaw = String(formData.get("paypal_link") ?? "").trim();
  const coverRaw = String(formData.get("cover_image") ?? "").trim();

  if (displayName.length < 1 || displayName.length > 80) {
    return { error: "Display name must be 1–80 characters." };
  }
  if (bio.length > 500) return { error: "Keep the bio under 500 characters." };

  const paypal = paypalRaw ? httpsUrl(paypalRaw) : null;
  if (paypalRaw && !paypal) return { error: "PayPal link must start with https://." };
  const cover = coverRaw ? httpsUrl(coverRaw) : null;
  if (coverRaw && !cover) return { error: "Cover image URL must start with https://." };

  if (!isSupabaseConfigured()) {
    return { error: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local." };
  }

  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to create a page." };

  const supabase = await createClient();
  const slug = normalizeSlug(rawSlug);
  const { error } = await supabase.from("creator_pages").insert({
    slug,
    display_name: displayName,
    bio: bio || null,
    paypal_link: paypal,
    cover_image: cover,
  });

  if (error) {
    if (error.code === "23505") return { error: "That link is already taken." };
    return { error: friendlyDbError(error.message) };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/${slug}`);
}

export async function updatePage(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const paypalRaw = String(formData.get("paypal_link") ?? "").trim();
  const coverRaw = String(formData.get("cover_image") ?? "").trim();

  if (displayName.length < 1 || displayName.length > 80) {
    return { error: "Display name must be 1–80 characters." };
  }
  if (bio.length > 500) return { error: "Keep the bio under 500 characters." };

  const paypal = paypalRaw ? httpsUrl(paypalRaw) : null;
  if (paypalRaw && !paypal) return { error: "PayPal link must start with https://." };
  const cover = coverRaw ? httpsUrl(coverRaw) : null;
  if (coverRaw && !cover) return { error: "Cover image URL must start with https://." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("creator_pages")
    .update({
      display_name: displayName,
      bio: bio || null,
      paypal_link: paypal,
      cover_image: cover,
    })
    .eq("id", access.page.id);

  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
  return { success: "Page details saved." };
}

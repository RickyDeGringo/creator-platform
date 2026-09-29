"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { httpsUrl } from "@/lib/format";
import { PHOTO_MAX_COUNT } from "@/lib/photo-frame";
import {
  finalizeLinksOrder,
  isIconSet,
  isPageService,
  pageServices,
  parseLinksOrderField,
  parsePageLink,
  type PageLinks,
} from "@/lib/page-links";
import { isPageFont, isPagePalette } from "@/lib/page-theme";
import { getStaffPage } from "@/lib/staff";
import { photoFiles, removeStored, storePhotos } from "@/lib/store-photos";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { friendlyDbError, normalizeSlug, slugError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

async function saveCoverImages(
  supabase: SupabaseClient,
  pageId: string,
  formData: FormData,
): Promise<{ error: string } | { cover: string | null }> {
  const coverRaw = String(formData.get("cover_image") ?? "").trim();
  const pasted = coverRaw ? httpsUrl(coverRaw) : null;
  if (coverRaw && !pasted) return { error: "Cover image URL must start with https://." };

  const files = photoFiles(formData);
  const removeIds = new Set(formData.getAll("remove_cover").map((value) => String(value)));
  const { data: existing, error: loadError } = await supabase
    .from("cover_images")
    .select("id, url, storage_path, sort_order")
    .eq("page_id", pageId)
    .order("sort_order");

  if (loadError) return { error: friendlyDbError(loadError.message) };

  const rows = existing ?? [];
  const removed = rows.filter((row) => removeIds.has(String(row.id)));
  const kept = rows.filter((row) => !removeIds.has(String(row.id)));
  if (kept.length + files.length + (pasted ? 1 : 0) > PHOTO_MAX_COUNT) {
    return { error: "A cover can show 5 images." };
  }
  if (removed.length === 0 && files.length === 0 && !pasted) {
    return { cover: kept[0] ? String(kept[0].url) : null };
  }

  const stored = await storePhotos(supabase, pageId, "cover", files);
  if ("error" in stored) return { error: stored.error };

  if (removed.length > 0) {
    const { error } = await supabase
      .from("cover_images")
      .delete()
      .in(
        "id",
        removed.map((row) => row.id),
      )
      .eq("page_id", pageId);
    if (error) {
      await removeStored(
        supabase,
        stored.photos.map((photo) => photo.path),
      );
      return { error: friendlyDbError(error.message) };
    }
    await removeStored(
      supabase,
      removed.flatMap((row) => (row.storage_path ? [String(row.storage_path)] : [])),
    );
  }

  const additions = [
    ...stored.photos.map((photo) => ({
      url: photo.url,
      storage_path: photo.path,
      width: photo.width,
      height: photo.height,
    })),
    ...(pasted ? [{ url: pasted, storage_path: null, width: null, height: null }] : []),
  ];

  if (additions.length > 0) {
    const { error } = await supabase.from("cover_images").insert(
      additions.map((photo, index) => ({
        page_id: pageId,
        url: photo.url,
        storage_path: photo.storage_path,
        width: photo.width,
        height: photo.height,
        sort_order: kept.length + index,
      })),
    );
    if (error) {
      await removeStored(
        supabase,
        stored.photos.map((photo) => photo.path),
      );
      return { error: friendlyDbError(error.message) };
    }
  }

  const first = kept[0] ? String(kept[0].url) : additions[0]?.url ?? null;
  return { cover: first };
}

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
  if (coverRaw && !httpsUrl(coverRaw)) return { error: "Cover image URL must start with https://." };

  if (!isSupabaseConfigured()) {
    return { error: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local." };
  }

  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to create a page." };

  const supabase = await createClient();
  const slug = normalizeSlug(rawSlug);
  const { data: created, error } = await supabase
    .from("creator_pages")
    .insert({
      slug,
      display_name: displayName,
      bio: bio || null,
      paypal_link: paypal,
      cover_image: null,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.code === "23505") return { error: "That link is already taken." };
    return { error: friendlyDbError(error?.message ?? "Could not create that page.") };
  }

  const covers = await saveCoverImages(supabase, created.id, formData);
  if ("error" in covers) {
    await supabase.from("creator_pages").delete().eq("id", created.id);
    return { error: covers.error };
  }

  if (covers.cover) {
    await supabase.from("creator_pages").update({ cover_image: covers.cover }).eq("id", created.id);
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

  if (displayName.length < 1 || displayName.length > 80) {
    return { error: "Display name must be 1–80 characters." };
  }
  if (bio.length > 500) return { error: "Keep the bio under 500 characters." };

  const paypal = paypalRaw ? httpsUrl(paypalRaw) : null;
  if (paypalRaw && !paypal) return { error: "PayPal link must start with https://." };

  const supabase = await createClient();
  const covers = await saveCoverImages(supabase, access.page.id, formData);
  if ("error" in covers) return { error: covers.error };

  const { error } = await supabase
    .from("creator_pages")
    .update({
      display_name: displayName,
      bio: bio || null,
      paypal_link: paypal,
      cover_image: covers.cover,
    })
    .eq("id", access.page.id);

  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
  return { success: "Page details saved." };
}

export async function updatePageDesign(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const palette = String(formData.get("palette") ?? "");
  const font = String(formData.get("font") ?? "");
  if (!isPagePalette(palette) || !isPageFont(font)) return { error: "Choose a palette and a font from the list." };

  const supabase = await createClient();
  const { error } = await supabase.from("creator_pages").update({ palette, font }).eq("id", access.page.id);
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
  return { success: "Page design saved." };
}

export async function updatePageLinks(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await getStaffPage(slug);
  if (!access.ok) return { error: access.error };

  const iconSet = String(formData.get("icon_set") ?? "");
  if (!isIconSet(iconSet)) return { error: "Choose an icon style." };

  const links: PageLinks = {};
  for (const service of pageServices) {
    if (!isPageService(service.id)) continue;
    const parsed = parsePageLink(service.id, String(formData.get(service.id) ?? ""));
    if ("error" in parsed) return { error: parsed.error };
    if (parsed.url) links[service.id] = parsed.url;
  }

  const linksOrder = finalizeLinksOrder(parseLinksOrderField(String(formData.get("links_order") ?? "")), links);

  const supabase = await createClient();
  const { error } = await supabase
    .from("creator_pages")
    .update({ icon_set: iconSet, links, links_order: linksOrder })
    .eq("id", access.page.id);
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/${slug}`);
  revalidatePath(`/dashboard/${slug}`);
  return { success: "Links saved." };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

export async function toggleFollow(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const following = String(formData.get("following") ?? "") === "1";
  const next = `/${slug}`;

  if (!isSupabaseConfigured()) redirect(`${next}?error=config`);

  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);

  const supabase = await createClient();
  const result = following
    ? await supabase.from("followers").delete().eq("page_id", pageId).eq("user_id", viewer.id)
    : await supabase.from("followers").insert({ page_id: pageId, user_id: viewer.id });

  if (result.error && result.error.code !== "23505") {
    redirect(`${next}?error=${encodeURIComponent(friendlyDbError(result.error.message))}`);
  }

  revalidatePath(next);
  revalidatePath("/");
  revalidatePath(`/dashboard/${slug}`);
}

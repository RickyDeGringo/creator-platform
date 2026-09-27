import { isSupabaseConfigured } from "@/lib/env";
import { toPage, toRole } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";
import type { CreatorPage, PageRole } from "@/lib/types";
import { friendlyDbError } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

const missingEnv = "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.";

export async function getStaffPage(slug: string): Promise<
  | { ok: false; error: string }
  | { ok: true; page: CreatorPage; role: PageRole; userId: string }
> {
  if (!isSupabaseConfigured()) return { ok: false, error: missingEnv };

  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to continue." };

  const supabase = await createClient();
  const { data: pageRow, error: pageError } = await supabase
    .from("creator_pages")
    .select("id, slug, display_name, bio, cover_image, paypal_link, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (pageError) return { ok: false, error: friendlyDbError(pageError.message) };
  if (!pageRow) return { ok: false, error: "That page does not exist." };

  const page = toPage(pageRow);
  const { data: membership, error: memberError } = await supabase
    .from("page_members")
    .select("role")
    .eq("page_id", page.id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (memberError) return { ok: false, error: friendlyDbError(memberError.message) };
  const role = toRole(membership?.role);
  if (!role) return { ok: false, error: "You do not manage this page." };

  return { ok: true, page, role, userId: viewer.id };
}

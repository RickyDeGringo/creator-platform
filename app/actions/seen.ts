"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markPostsSeen(postIds: string[]): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false };
  const viewer = await getViewer();
  if (!viewer) return { ok: false };

  const ids = [...new Set(postIds.map((id) => id.trim().toLowerCase()))].filter((id) => UUID.test(id)).slice(0, 40);
  if (ids.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_posts_seen", { p_post_ids: ids });
  return { ok: !error };
}

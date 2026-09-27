import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/types";

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("username")
      .eq("id", data.user.id)
      .maybeSingle();

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      username: profile?.username ?? null,
    };
  } catch {
    return null;
  }
});

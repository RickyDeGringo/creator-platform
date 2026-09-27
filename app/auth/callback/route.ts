import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validators";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/login?error=confirm", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=confirm", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

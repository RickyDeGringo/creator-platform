import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatePageForm } from "@/components/dashboard/page-forms";
import { SetupNotice } from "@/components/setup-notice";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/env";
import { toPage, toRole } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/lib/types";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Pages" };

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12">
        <SetupNotice />
        <CreatePageForm />
      </div>
    );
  }

  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const { data: memberRows, error } = await supabase
    .from("page_members")
    .select("role, page_id")
    .eq("user_id", viewer.id);

  let memberships: Membership[] = [];
  if (!error && memberRows && memberRows.length > 0) {
    const ids = memberRows.map((row) => String(row.page_id));
    const { data: pages } = await supabase
      .from("creator_pages")
      .select("id, slug, display_name, bio, cover_image, paypal_link, created_at")
      .in("id", ids);

    const byId = new Map((pages ?? []).map((page) => [String(page.id), toPage(page)]));
    memberships = memberRows.flatMap((row) => {
      const page = byId.get(String(row.page_id));
      const role = toRole(row.role);
      return page && role ? [{ page, role }] : [];
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-12">
      <div>
        <h1 className="font-heading text-5xl">Pages</h1>
        <p className="mt-2 text-muted-foreground">Owners and managers can publish posts, update goals, and issue access.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <div className="grid gap-3">
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">You do not manage a page yet.</p>
        ) : (
          memberships.map((membership) => (
            <Link
              key={membership.page.id}
              href={`/dashboard/${membership.page.slug}`}
              className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10"
            >
              <span>
                <span className="block font-medium">{membership.page.display_name}</span>
                <span className="text-sm text-muted-foreground">/{membership.page.slug}</span>
              </span>
              <Badge variant="secondary">{membership.role}</Badge>
            </Link>
          ))
        )}
      </div>

      <section className="space-y-4">
        <h2 className="font-heading text-3xl">Create a page</h2>
        <CreatePageForm />
      </section>
    </div>
  );
}

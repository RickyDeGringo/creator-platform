import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessManager } from "@/components/dashboard/access-manager";
import { GoalManager } from "@/components/dashboard/goal-manager";
import { PageDetailsForm } from "@/components/dashboard/page-forms";
import { PostManager } from "@/components/dashboard/post-manager";
import { SetupNotice } from "@/components/setup-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { toAccessCode, toGoal, toManagedPost, toPage, toRole } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} dashboard` };
}

export default async function DashboardSlugPage({ params }: Props) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <SetupNotice />
      </div>
    );
  }

  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/dashboard/${slug}`);

  const supabase = await createClient();
  const { data: pageRow } = await supabase
    .from("creator_pages")
    .select("id, slug, display_name, bio, cover_image, paypal_link, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!pageRow) notFound();
  const page = toPage(pageRow);

  const { data: membership } = await supabase
    .from("page_members")
    .select("role")
    .eq("page_id", page.id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  const role = toRole(membership?.role);
  if (!role) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-24 text-center">
        <h1 className="font-heading text-5xl">Managers only</h1>
        <p className="mt-3 text-muted-foreground">You need to be an owner or manager of this page.</p>
        <Link href={`/${page.slug}`} className="mt-6 inline-block text-sm underline underline-offset-4">
          View the public page
        </Link>
      </div>
    );
  }

  const [postsResult, goalsResult, codesResult] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, page_id, content, image_url, is_paywalled, created_at, post_images(url, width, height, sort_order), post_goals(sort_order, goals(id, title))",
      )
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("goals")
      .select("id, page_id, title, description, link, target_amount, current_amount_raised, created_at")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("access_codes")
      .select("id, page_id, code_string, duration_days, is_redeemed, redeemed_by_user, created_at")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">/{page.slug}</p>
          <h1 className="font-heading text-5xl">{page.display_name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{role}</Badge>
          <Link href={`/${page.slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            View page
          </Link>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <a href="#details" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Details
        </a>
        <a href="#posts" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Posts
        </a>
        <a href="#goals" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Goals
        </a>
        <a href="#access" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Access
        </a>
      </nav>

      {postsResult.error || goalsResult.error || codesResult.error ? (
        <p className="mt-6 text-sm text-destructive">
          {postsResult.error?.message ?? goalsResult.error?.message ?? codesResult.error?.message}
        </p>
      ) : null}

      <section id="details" className="mt-10 space-y-4">
        <h2 className="font-heading text-3xl">Details</h2>
        <PageDetailsForm page={page} />
      </section>

      <section id="posts" className="mt-12 space-y-4">
        <h2 className="font-heading text-3xl">Posts</h2>
        <PostManager
          slug={page.slug}
          posts={(postsResult.data ?? []).map(toManagedPost)}
          goals={(goalsResult.data ?? []).map(toGoal)}
        />
      </section>

      <section id="goals" className="mt-12 space-y-4">
        <h2 className="font-heading text-3xl">Goals</h2>
        <GoalManager slug={page.slug} goals={(goalsResult.data ?? []).map(toGoal)} />
      </section>

      <section id="access" className="mt-12 space-y-4">
        <h2 className="font-heading text-3xl">Access</h2>
        <AccessManager slug={page.slug} codes={(codesResult.data ?? []).map(toAccessCode)} />
      </section>
    </div>
  );
}

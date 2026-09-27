import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessManager } from "@/components/dashboard/access-manager";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { DesignManager } from "@/components/dashboard/design-manager";
import { GoalManager } from "@/components/dashboard/goal-manager";
import { MemberManager } from "@/components/dashboard/member-manager";
import { PageDetailsForm } from "@/components/dashboard/page-forms";
import { PostManager } from "@/components/dashboard/post-manager";
import { SetupNotice } from "@/components/setup-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { reactionCountsFor, reactionsUnavailable } from "@/lib/reactions";
import { toAccessCode, toCoverImage, toGoal, toManagedPost, toPage, toPageMember, toRole, toWishlistCategory } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/validators";
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
  const { data: pageRow, error: pageError } = await supabase
    .from("creator_pages")
    .select("id, slug, display_name, bio, cover_image, paypal_link, palette, font, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (pageError) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-24 text-center">
        <h1 className="font-heading text-5xl">Page unavailable</h1>
        <p className="mt-3 text-muted-foreground">{friendlyDbError(pageError.message)}</p>
      </div>
    );
  }

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

  const [postsResult, goalsResult, categoriesResult, coversResult, codesResult, membersResult, reactionsResult] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, page_id, content, image_url, is_paywalled, created_at, post_images(url, width, height, sort_order), post_goals(sort_order, goals(id, title)), comments(count)",
      )
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("goals")
      .select(
        "id, page_id, title, description, link, image_url, image_storage_path, image_width, image_height, target_amount, current_amount_raised, created_at, goal_categories(category_id)",
      )
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("wishlist_categories")
      .select("id, page_id, name, created_at")
      .eq("page_id", page.id)
      .order("name"),
    supabase
      .from("cover_images")
      .select("id, url, storage_path, width, height, sort_order")
      .eq("page_id", page.id)
      .order("sort_order"),
    supabase
      .from("access_codes")
      .select("id, page_id, code_string, duration_days, is_redeemed, redeemed_by_user, created_at")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false }),
    supabase.from("page_members").select("user_id, role, users(username)").eq("page_id", page.id),
    supabase.rpc("reaction_totals", { p_page_id: page.id }),
  ]);

  const members = (membersResult.data ?? [])
    .flatMap((row) => {
      const member = toPageMember(row);
      return member ? [member] : [];
    })
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
      return a.username.localeCompare(b.username);
    });

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

      {postsResult.error ||
      goalsResult.error ||
      categoriesResult.error ||
      coversResult.error ||
      codesResult.error ||
      membersResult.error ||
      (reactionsResult.error && !reactionsUnavailable(reactionsResult.error.message)) ? (
        <p className="mt-6 text-sm text-destructive">
          {postsResult.error?.message ??
            goalsResult.error?.message ??
            categoriesResult.error?.message ??
            coversResult.error?.message ??
            codesResult.error?.message ??
            membersResult.error?.message ??
            reactionsResult.error?.message}
        </p>
      ) : null}

      <DashboardTabs
        details={
          <PageDetailsForm
            page={page}
            covers={(coversResult.data ?? []).flatMap((row) => {
              const cover = toCoverImage(row);
              return cover ? [cover] : [];
            })}
          />
        }
        design={
          <DesignManager
            slug={page.slug}
            displayName={page.display_name}
            bio={page.bio}
            palette={page.palette}
            font={page.font}
          />
        }
        posts={
          <PostManager
            slug={page.slug}
            posts={(postsResult.data ?? []).map((row) => {
              const post = toManagedPost(row);
              const rows = reactionsUnavailable(reactionsResult.error?.message) ? [] : (reactionsResult.data ?? []);
              return { ...post, reactions: reactionCountsFor(rows, post.id) };
            })}
            goals={(goalsResult.data ?? []).map(toGoal)}
            categories={(categoriesResult.data ?? []).flatMap((row) => {
              const category = toWishlistCategory(row);
              return category ? [category] : [];
            })}
          />
        }
        wishlist={
          <GoalManager
            slug={page.slug}
            goals={(goalsResult.data ?? []).map(toGoal)}
            categories={(categoriesResult.data ?? []).flatMap((row) => {
              const category = toWishlistCategory(row);
              return category ? [category] : [];
            })}
          />
        }
        managers={<MemberManager slug={page.slug} role={role} members={members} />}
        access={<AccessManager slug={page.slug} codes={(codesResult.data ?? []).map(toAccessCode)} />}
      />
    </div>
  );
}

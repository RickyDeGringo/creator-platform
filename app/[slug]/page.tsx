import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorView } from "@/components/creator/creator-view";
import { PageTheme } from "@/components/creator/page-theme";
import { SetupNotice } from "@/components/setup-notice";
import { loadCreatorPage } from "@/lib/creator-page";
import { pageFont, pagePalette } from "@/lib/page-theme";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadCreatorPage(slug);
  if (result.status !== "ok") return { title: slug };
  return {
    title: result.data.page.display_name,
    description: result.data.page.bio ?? `Creator page for ${result.data.page.display_name}`,
  };
}

export default async function CreatorPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const result = await loadCreatorPage(slug);

  if (result.status === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <SetupNotice />
      </div>
    );
  }
  if (result.status === "not_found") notFound();
  if (result.status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <SetupNotice detail={result.message} />
      </div>
    );
  }

  const { page, covers, goals, categories, posts, followerCount, isFollowing, isMember, canManage, viewer } = result.data;

  return (
    <PageTheme palette={pagePalette(page.palette)} font={pageFont(page.font)}>
      <CreatorView
      slug={page.slug}
      pageId={page.id}
      displayName={page.display_name}
      bio={page.bio}
      covers={covers}
      paypalLink={page.paypal_link}
      followerCount={followerCount}
      isFollowing={isFollowing}
      signedIn={Boolean(viewer)}
      commentAccess={{
        signedIn: Boolean(viewer),
        following: isFollowing,
        member: isMember,
        viewerId: viewer?.id ?? null,
      }}
      goals={goals}
      categories={categories}
      posts={posts}
      canManage={canManage}
      notice={error ?? null}
    />
    </PageTheme>
  );
}

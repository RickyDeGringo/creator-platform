import type { Metadata } from "next";
import { goToPage } from "@/app/actions/pages";
import { FindCreators } from "@/components/home/find-creators";
import { FollowingHome } from "@/components/home/following-home";
import { PostFeed } from "@/components/creator/post-feed";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creatorSearchTerm, loadFollowingHome, searchCreators } from "@/lib/following";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  if (viewer) return { title: "Following" };
  return { title: "Creator pages for live streams" };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { error, q } = await searchParams;
  const home = await loadFollowingHome();

  if (home.status === "unconfigured" || home.status === "signed_out") {
    return <Landing error={error} />;
  }

  if (home.status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <SetupNotice detail={home.message} />
      </div>
    );
  }

  if (home.status === "empty") {
    const query = creatorSearchTerm(q ?? "");
    const search = query ? await searchCreators(query) : { results: [] };
    return <FindCreators query={query} results={search.results} error={search.error} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-20">
      <div className="mb-6 space-y-2">
        <p className="text-sm tracking-[0.2em] text-primary uppercase">Your feed</p>
        <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-6xl">Following</h1>
      </div>
      <FollowingHome creators={home.creators}>
        <PostFeed
          posts={home.posts}
          paypalLink={null}
          slug=""
          access={{
            signedIn: true,
            following: true,
            member: false,
            viewerId: home.viewer.id,
          }}
          canManage={false}
          goals={[]}
          categories={[]}
          showJumpStrip={false}
        />
      </FollowingHome>
    </div>
  );
}

function Landing({ error }: { error?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 sm:py-24">
      <div className="space-y-4">
        <p className="text-sm tracking-[0.2em] text-primary uppercase">Live creator pages</p>
        <h1 className="max-w-xl font-heading text-6xl leading-[0.9] tracking-tight sm:text-7xl">
          The booth stays open after the stream.
        </h1>
        <p className="max-w-lg text-lg leading-8 text-muted-foreground">
          A public page for your goals and posts. Followers can chip in through PayPal. Member posts stay locked until an access code is redeemed.
        </p>
      </div>

      <form action={goToPage} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <Label htmlFor="slug">Open a creator page</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="slug" name="slug" placeholder="creator-name" className="h-10" />
          <Button type="submit" size="lg">
            Visit
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Enter the slug from a creator link, such as your-name.</p>
        )}
      </form>
    </div>
  );
}

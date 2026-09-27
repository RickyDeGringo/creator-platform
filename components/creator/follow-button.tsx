"use client";

import { useFormStatus } from "react-dom";
import { toggleFollow } from "@/app/actions/follow";
import { Button, buttonVariants } from "@/components/ui/button";

function FollowSubmit({ following }: { following: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={following ? "outline" : "default"} disabled={pending}>
      {pending ? "Saving…" : following ? "Following" : "Follow"}
    </Button>
  );
}

export function FollowButton({
  slug,
  pageId,
  isFollowing,
  signedIn,
}: {
  slug: string;
  pageId: string;
  isFollowing: boolean;
  signedIn: boolean;
}) {
  if (!signedIn) {
    return (
      <a href={`/login?next=/${encodeURIComponent(slug)}`} className={buttonVariants({ size: "lg" })}>
        Follow
      </a>
    );
  }

  return (
    <form action={toggleFollow}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="following" value={isFollowing ? "1" : "0"} />
      <FollowSubmit following={isFollowing} />
    </form>
  );
}

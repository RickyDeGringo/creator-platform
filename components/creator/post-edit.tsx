"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { updatePost } from "@/app/actions/posts";
import { WishlistItemPicker } from "@/components/dashboard/wishlist-item-picker";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublishedAtField } from "@/components/published-at-field";
import { formatTimestamp } from "@/lib/format";
import type { FeedPost, Goal, WishlistCategory } from "@/lib/types";

export function PostFrame({
  slug,
  post,
  canManage,
  goals,
  categories,
  children,
}: {
  slug: string;
  post: Pick<FeedPost, "id" | "title" | "content" | "created_at" | "is_paywalled" | "goals">;
  canManage: boolean;
  goals: Pick<Goal, "id" | "title" | "category_ids">[];
  categories: Pick<WishlistCategory, "id" | "name">[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updatePost.bind(null, slug), null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <time dateTime={post.created_at} suppressHydrationWarning>
          {formatTimestamp(post.created_at)}
        </time>
        <div className="flex items-center gap-2">
          {canManage ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((current) => !current)}>
              {open ? "Close" : "Edit"}
            </Button>
          ) : null}
          {post.is_paywalled ? <Badge variant="secondary">Members</Badge> : null}
        </div>
      </div>
      {open ? (
        <form action={action} className="mb-4 space-y-3 rounded-xl bg-muted/50 p-3">
          <input type="hidden" name="postId" value={post.id} />
          <div className="space-y-2">
            <Label htmlFor={`title-${post.id}`}>Title</Label>
            <Input id={`title-${post.id}`} name="title" maxLength={120} defaultValue={post.title ?? ""} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`content-${post.id}`}>Body</Label>
            <Textarea id={`content-${post.id}`} name="content" defaultValue={post.content ?? ""} className="min-h-28" />
          </div>
          <PublishedAtField id={`published-${post.id}`} iso={post.created_at} />
          <WishlistItemPicker
            goals={goals}
            categories={categories}
            selectedIds={post.goals.map((goal) => goal.id)}
          />
          <FormMessage state={state} />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      ) : null}
      {children}
    </>
  );
}

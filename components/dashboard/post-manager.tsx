"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPost, deletePost } from "@/app/actions/posts";
import { FormMessage } from "@/components/form-message";
import { PhotoField, type PhotoFieldHandle } from "@/components/dashboard/photo-field";
import { WishlistItemPicker } from "@/components/dashboard/wishlist-item-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublishedAtField } from "@/components/published-at-field";
import { formatTimestamp } from "@/lib/format";
import type { Goal, ManagedPost, WishlistCategory } from "@/lib/types";

export function PostManager({
  slug,
  posts,
  goals,
  categories,
}: {
  slug: string;
  posts: ManagedPost[];
  goals: Pick<Goal, "id" | "title" | "category_ids">[];
  categories: Pick<WishlistCategory, "id" | "name">[];
}) {
  const [state, action, pending] = useActionState(createPost.bind(null, slug), null);
  const [deleteState, deleteAction] = useActionState(deletePost.bind(null, slug), null);
  const [preparing, setPreparing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const photosRef = useRef<PhotoFieldHandle>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={(formData) => {
          for (const file of photosRef.current?.files ?? []) formData.append("photos", file);
          action(formData);
        }}
        className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="space-y-2">
          <Label htmlFor="content">Post</Label>
          <Textarea id="content" name="content" placeholder="What happened on the ride?" className="min-h-28" />
        </div>

        <PhotoField
          id="photos"
          label="Photos"
          hint="Drop photos here. Very wide or very tall shots are trimmed evenly so they fit the page."
          revision={state}
          onPreparing={setPreparing}
          fieldRef={photosRef}
        />

        <div className="space-y-2">
          <Label htmlFor="image_url">Image URL</Label>
          <Input id="image_url" name="image_url" type="url" placeholder="https://" className="h-10" />
          <p className="text-sm text-muted-foreground">Optional. Uploaded photos load faster than a pasted link.</p>
        </div>

        <PublishedAtField id="published-at" revision={state} />

        <WishlistItemPicker goals={goals} categories={categories} revision={state} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_paywalled" className="size-4" />
          Paywalled
        </label>
        <FormMessage state={state} />
        <Button type="submit" disabled={pending || preparing}>
          {pending ? "Publishing…" : "Publish"}
        </Button>
      </form>

      <FormMessage state={deleteState} />
      <div className="grid gap-3">
        {posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : null}
        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="mb-2 flex items-center justify-between gap-3">
              <time className="text-sm text-muted-foreground" dateTime={post.created_at} suppressHydrationWarning>
                {formatTimestamp(post.created_at)}
              </time>
              {post.is_paywalled ? <Badge variant="secondary">Paywalled</Badge> : <Badge variant="outline">Public</Badge>}
            </div>
            {post.images.length > 0 ? (
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {post.images.map((image, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${image.url}-${index}`}
                    src={image.url}
                    alt=""
                    className="h-16 w-auto max-w-28 rounded-lg bg-muted object-contain"
                  />
                ))}
              </div>
            ) : null}
            {post.content ? <p className="line-clamp-3 text-sm leading-6 whitespace-pre-wrap">{post.content}</p> : null}
            {post.goals.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Goals: {post.goals.map((goal) => goal.title).join(", ")}</p>
            ) : null}
            <form action={deleteAction} className="mt-3">
              <input type="hidden" name="postId" value={post.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  if (!window.confirm("Delete this post?")) event.preventDefault();
                }}
              >
                Delete
              </Button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}

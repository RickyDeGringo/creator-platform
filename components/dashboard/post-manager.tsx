"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPost, deletePost } from "@/app/actions/posts";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { ManagedPost } from "@/lib/types";

export function PostManager({ slug, posts }: { slug: string; posts: ManagedPost[] }) {
  const [state, action] = useActionState(createPost.bind(null, slug), null);
  const [deleteState, deleteAction] = useActionState(deletePost.bind(null, slug), null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={action} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="space-y-2">
          <Label htmlFor="content">Post</Label>
          <Textarea id="content" name="content" placeholder="What happened on stream?" className="min-h-28" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image_url">Image URL</Label>
          <Input id="image_url" name="image_url" type="url" placeholder="https://" className="h-10" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_paywalled" className="size-4" />
          Paywalled
        </label>
        <FormMessage state={state} />
        <Button type="submit">Publish</Button>
      </form>

      <FormMessage state={deleteState} />
      <div className="grid gap-3">
        {posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : null}
        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="mb-2 flex items-center justify-between gap-3">
              <time className="text-sm text-muted-foreground" dateTime={post.created_at}>
                {formatDate(post.created_at)}
              </time>
              {post.is_paywalled ? <Badge variant="secondary">Paywalled</Badge> : <Badge variant="outline">Public</Badge>}
            </div>
            {post.content ? <p className="line-clamp-3 text-sm leading-6 whitespace-pre-wrap">{post.content}</p> : null}
            {post.image_url ? <p className="mt-2 truncate text-xs text-muted-foreground">{post.image_url}</p> : null}
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

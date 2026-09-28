"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createPost, deletePost, updatePost } from "@/app/actions/posts";
import { FormMessage } from "@/components/form-message";
import { PhotoField, type PhotoFieldHandle } from "@/components/dashboard/photo-field";
import { WishlistItemPicker } from "@/components/dashboard/wishlist-item-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubscribersToggle } from "@/components/dashboard/subscribers-toggle";
import { PublishedAtField } from "@/components/published-at-field";
import { formatTimestamp } from "@/lib/format";
import { reactionGlyph, reactionLabel } from "@/lib/reactions";
import { cn } from "@/lib/utils";
import type { Goal, ManagedPost, WishlistCategory } from "@/lib/types";

type WishlistGoal = Pick<Goal, "id" | "title" | "category_ids" | "image_url">;

function postTitle(post: ManagedPost) {
  const titled = post.title?.trim();
  if (titled) return titled;
  const line = post.content
    ?.split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  if (line) return line;
  if (post.images.length === 1) return "Photo";
  if (post.images.length > 1) return `${post.images.length} photos`;
  return "Post";
}

function PostDialog({
  title,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-0 bg-card p-5 text-foreground shadow-2xl backdrop:bg-black/60",
        wide ? "w-[min(42rem,calc(100%-2rem))]" : "w-[min(32rem,calc(100%-2rem))]",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-heading text-2xl">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}

function EditPostForm({
  slug,
  post,
  goals,
  categories,
  onDone,
}: {
  slug: string;
  post: ManagedPost;
  goals: WishlistGoal[];
  categories: Pick<WishlistCategory, "id" | "name">[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updatePost.bind(null, slug), null);
  const [deleteState, deleteAction] = useActionState(deletePost.bind(null, slug), null);

  useEffect(() => {
    if (state?.success || deleteState?.success) onDone();
  }, [deleteState, onDone, state]);

  return (
    <div className="space-y-4">
      {post.images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {post.images.map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${image.url}-${index}`}
              src={image.url}
              alt=""
              className="h-20 w-auto max-w-32 rounded-lg bg-muted object-contain"
            />
          ))}
        </div>
      ) : null}
      <form action={action} className="space-y-4">
        <input type="hidden" name="postId" value={post.id} />
        <input type="hidden" name="update_paywall" value="1" />
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
        <SubscribersToggle id={`subscribers-${post.id}`} defaultChecked={post.is_paywalled} />
        <FormMessage state={state} />
        {post.is_draft ? (
          <div className="grid grid-cols-2 gap-3">
            <Button type="submit" name="intent" value="draft" variant="secondary" className="h-10 w-full" disabled={pending}>
              {pending ? "Saving…" : "Save as draft"}
            </Button>
            <Button type="submit" name="intent" value="publish" className="h-10 w-full" disabled={pending}>
              {pending ? "Publishing…" : "Publish"}
            </Button>
          </div>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        )}
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="postId" value={post.id} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            if (!window.confirm("Delete this post?")) event.preventDefault();
          }}
        >
          Delete post
        </Button>
        <FormMessage state={deleteState} />
      </form>
    </div>
  );
}

function PostRow({
  slug,
  post,
  goals,
  categories,
}: {
  slug: string;
  post: ManagedPost;
  goals: WishlistGoal[];
  categories: Pick<WishlistCategory, "id" | "name">[];
}) {
  const [open, setOpen] = useState(false);
  const title = postTitle(post);
  const comments = post.comment_count === 1 ? "1 comment" : `${post.comment_count} comments`;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer flex-col gap-3 bg-transparent px-3 py-3 text-left hover:bg-muted/60 sm:flex-row sm:items-center sm:py-2"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {post.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.images[0].url} alt="" className="size-12 shrink-0 rounded-md bg-muted object-cover" />
          ) : (
            <span className="block size-12 shrink-0 rounded-md bg-muted" />
          )}
          <span className="flex min-h-12 min-w-0 flex-1 flex-col justify-center">
            <span className="block truncate text-base font-medium sm:text-sm">{title}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              <time dateTime={post.created_at} suppressHydrationWarning>
                {formatTimestamp(post.created_at)}
              </time>
              {post.goals.length > 0 ? ` · ${post.goals.map((goal) => goal.title).join(", ")}` : ""}
            </span>
          </span>
        </span>
        <span className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 pl-[3.75rem] sm:max-w-xs sm:justify-end sm:pl-0">
          {post.reactions.map((reaction) => (
            <span key={reaction.emoji} className="text-sm text-muted-foreground tabular-nums" title={reactionLabel(reaction.emoji)}>
              <span aria-hidden="true">{reactionGlyph(reaction.emoji)}</span>
              <span className="sr-only">{reactionLabel(reaction.emoji)}</span> {reaction.count}
            </span>
          ))}
          <span className="text-sm text-muted-foreground tabular-nums">{comments}</span>
          {post.is_draft ? (
            <Badge variant="outline">Draft</Badge>
          ) : post.is_paywalled ? (
            <Badge variant="secondary">Subscribers</Badge>
          ) : (
            <Badge variant="outline">Public</Badge>
          )}
        </span>
      </button>
      {open ? (
        <PostDialog title="Edit post" onClose={() => setOpen(false)}>
          <EditPostForm
            slug={slug}
            post={post}
            goals={goals}
            categories={categories}
            onDone={() => setOpen(false)}
          />
        </PostDialog>
      ) : null}
    </li>
  );
}

function NewPostForm({
  slug,
  goals,
  categories,
  onDone,
}: {
  slug: string;
  goals: WishlistGoal[];
  categories: Pick<WishlistCategory, "id" | "name">[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(createPost.bind(null, slug), null);
  const [preparing, setPreparing] = useState(false);
  const [intent, setIntent] = useState<"draft" | "publish" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const photosRef = useRef<PhotoFieldHandle>(null);

  useEffect(() => {
    if (!state?.success) return;
    formRef.current?.reset();
    onDone();
  }, [onDone, state]);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        for (const file of photosRef.current?.files ?? []) formData.append("photos", file);
        action(formData);
      }}
      className="space-y-4"
    >
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

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" maxLength={120} placeholder="Give the post a title" className="h-10" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Body</Label>
        <Textarea id="content" name="content" placeholder="What happened on the ride?" className="min-h-28" />
      </div>

      <WishlistItemPicker goals={goals} categories={categories} revision={state} />

      <div className="grid grid-cols-2 items-end gap-3 *:min-w-0">
        <PublishedAtField id="published-at" revision={state} />
        <SubscribersToggle id="subscribers-only" />
      </div>

      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-3 *:min-w-0">
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="secondary"
          className="h-10 w-full"
          disabled={pending || preparing}
          onClick={() => setIntent("draft")}
        >
          {pending && intent === "draft" ? "Saving…" : "Save as draft"}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="publish"
          className="h-10 w-full"
          disabled={pending || preparing}
          onClick={() => setIntent("publish")}
        >
          {pending && intent === "publish" ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </form>
  );
}

export function PostManager({
  slug,
  posts,
  goals,
  categories,
}: {
  slug: string;
  posts: ManagedPost[];
  goals: WishlistGoal[];
  categories: Pick<WishlistCategory, "id" | "name">[];
}) {
  const [composer, setComposer] = useState(false);

  return (
    <div className="space-y-6">
      <Button type="button" onClick={() => setComposer(true)}>
        New post
      </Button>
      {composer ? (
        <PostDialog title="New post" wide onClose={() => setComposer(false)}>
          <NewPostForm slug={slug} goals={goals} categories={categories} onDone={() => setComposer(false)} />
        </PostDialog>
      ) : null}

      {posts.length === 0 ? (
        <p className="rounded-2xl bg-card px-3 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No posts yet.
        </p>
      ) : (
        <ul className="divide-y divide-foreground/10 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {posts.map((post) => (
            <PostRow
              key={`${post.id}-${post.created_at}-${post.is_paywalled}-${post.is_draft}-${post.title ?? ""}-${post.content ?? ""}-${post.comment_count}-${post.reactions.map((reaction) => `${reaction.emoji}${reaction.count}`).join(".")}-${post.goals.map((goal) => goal.id).join(",")}`}
              slug={slug}
              post={post}
              goals={goals}
              categories={categories}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

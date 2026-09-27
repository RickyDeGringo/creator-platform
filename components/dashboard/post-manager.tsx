"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPost, deletePost } from "@/app/actions/posts";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { PHOTO_MAX_COUNT } from "@/lib/photo-frame";
import { preparePhotoFile } from "@/lib/prepare-photo";
import type { Goal, ManagedPost } from "@/lib/types";

type DraftPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export function PostManager({
  slug,
  posts,
  goals,
}: {
  slug: string;
  posts: ManagedPost[];
  goals: Pick<Goal, "id" | "title">[];
}) {
  const [state, action, pending] = useActionState(createPost.bind(null, slug), null);
  const [deleteState, deleteAction] = useActionState(deletePost.bind(null, slug), null);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<DraftPhoto[]>([]);
  const preparingRef = useRef(false);
  const [seenSuccess, setSeenSuccess] = useState<string | undefined>();

  if (state?.success && state.success !== seenSuccess) {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setSeenSuccess(state.success);
    setPhotos([]);
    setLocalError(null);
  }

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  async function addFiles(files: File[]) {
    if (files.length === 0 || preparingRef.current) return;
    preparingRef.current = true;
    setPreparing(true);
    setLocalError(null);
    const next = [...photos];
    let message: string | null = null;

    for (const file of files) {
      if (next.length >= PHOTO_MAX_COUNT) {
        message = `You can add ${PHOTO_MAX_COUNT} photos.`;
        break;
      }
      try {
        const prepared = await preparePhotoFile(file);
        next.push({
          id: crypto.randomUUID(),
          file: prepared,
          previewUrl: URL.createObjectURL(prepared),
        });
      } catch (error) {
        message = error instanceof Error ? error.message : "Could not prepare that photo.";
      }
    }

    setPhotos(next);
    setLocalError(message);
    preparingRef.current = false;
    setPreparing(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  }

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={(formData) => {
          for (const photo of photos) formData.append("photos", photo.file);
          action(formData);
        }}
        className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="space-y-2">
          <Label htmlFor="content">Post</Label>
          <Textarea id="content" name="content" placeholder="What happened on the ride?" className="min-h-28" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="photos">Photos</Label>
          <div
            className={
              dragging
                ? "rounded-xl bg-muted p-4 ring-2 ring-primary"
                : "rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/10"
            }
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void addFiles([...event.dataTransfer.files]);
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={preparing || photos.length >= PHOTO_MAX_COUNT} onClick={() => inputRef.current?.click()}>
                {preparing ? "Preparing…" : "Add photos"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {photos.length} of {PHOTO_MAX_COUNT}. Resized for fast loading, never stretched.
              </p>
            </div>
            <input
              ref={inputRef}
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(event) => {
                void addFiles([...(event.target.files ?? [])]);
              }}
            />
            {photos.length > 0 ? (
              <ul className="mt-3 flex gap-2 overflow-x-auto">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="relative shrink-0">
                    {/* Prepared preview of the photo that will be uploaded. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={`Selected photo ${index + 1}`}
                      className="h-24 w-auto max-w-40 rounded-lg bg-background object-contain"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-md bg-background/90 px-1.5 py-0.5 text-xs"
                      onClick={() => removePhoto(photo.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Drop photos here. Very wide or very tall shots are trimmed evenly so they fit the page.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image_url">Image URL</Label>
          <Input id="image_url" name="image_url" type="url" placeholder="https://" className="h-10" />
          <p className="text-sm text-muted-foreground">Optional. Uploaded photos load faster than a pasted link.</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Attach goals</legend>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a goal below, then pin it to a post. A ride update can point people at a new saddle and a new bell.
            </p>
          ) : (
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl bg-muted/50 p-3">
              {goals.map((goal) => (
                <label key={goal.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="goal_ids" value={goal.id} className="size-4" />
                  <span className="truncate">{goal.title}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_paywalled" className="size-4" />
          Paywalled
        </label>
        {localError ? (
          <p role="alert" className="text-sm text-destructive">
            {localError}
          </p>
        ) : null}
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
              <time className="text-sm text-muted-foreground" dateTime={post.created_at}>
                {formatDate(post.created_at)}
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

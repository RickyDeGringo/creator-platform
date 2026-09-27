"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createWishlistCategory,
  deleteWishlistCategory,
  renameWishlistCategory,
} from "@/app/actions/wishlist";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WishlistCategory } from "@/lib/types";

function CategoryRow({ slug, category }: { slug: string; category: WishlistCategory }) {
  const [editing, setEditing] = useState(false);
  const [renameState, renameAction, renamePending] = useActionState(
    renameWishlistCategory.bind(null, slug),
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteWishlistCategory.bind(null, slug),
    null,
  );

  useEffect(() => {
    if (renameState?.success) setEditing(false);
  }, [renameState]);

  return (
    <li className="px-3 py-2">
      {editing ? (
        <form action={renameAction} className="flex items-center gap-2">
          <input type="hidden" name="categoryId" value={category.id} />
          <Label htmlFor={`category-${category.id}`} className="sr-only">
            Tag name
          </Label>
          <Input
            id={`category-${category.id}`}
            name="name"
            required
            maxLength={40}
            defaultValue={category.name}
            autoFocus
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={renamePending}>
            {renamePending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={renamePending} onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Rename
          </Button>
          <form action={deleteAction}>
            <input type="hidden" name="categoryId" value={category.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={deletePending}
              onClick={(event) => {
                if (!window.confirm(`Delete “${category.name}”? Items keep their other tags.`)) {
                  event.preventDefault();
                }
              }}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </form>
        </div>
      )}
      <FormMessage state={renameState?.error ? renameState : null} />
      <FormMessage state={deleteState?.error ? deleteState : null} />
    </li>
  );
}

export function WishlistCategories({ slug, categories }: { slug: string; categories: WishlistCategory[] }) {
  const [state, action, pending] = useActionState(createWishlistCategory.bind(null, slug), null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <section className="rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">Tags</h3>
          <p className="text-sm text-muted-foreground">Visitors filter the wishlist with these. A goal can wear several.</p>
        </div>
        <form ref={formRef} action={action} className="flex items-center gap-2 sm:w-80">
          <Label htmlFor="category-name" className="sr-only">
            New tag
          </Label>
          <Input
            id="category-name"
            name="name"
            required
            maxLength={40}
            placeholder="New tag"
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </form>
      </div>
      {state ? (
        <div className="px-3 pb-2">
          <FormMessage state={state} />
        </div>
      ) : null}
      {categories.length === 0 ? (
        <p className="border-t border-foreground/10 px-3 py-3 text-sm text-muted-foreground">No tags yet.</p>
      ) : (
        <ul className="divide-y divide-foreground/10 border-t border-foreground/10">
          {categories.map((category) => (
            <CategoryRow key={`${category.id}-${category.name}`} slug={slug} category={category} />
          ))}
        </ul>
      )}
    </section>
  );
}

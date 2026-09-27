"use client";

import { useActionState, useEffect, useRef } from "react";
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
  const [renameState, renameAction, renamePending] = useActionState(
    renameWishlistCategory.bind(null, slug),
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteWishlistCategory.bind(null, slug),
    null,
  );

  return (
    <li className="space-y-2 rounded-xl bg-background p-3 ring-1 ring-foreground/10">
      <form action={renameAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="categoryId" value={category.id} />
        <Label htmlFor={`category-${category.id}`} className="sr-only">
          Category name
        </Label>
        <Input
          id={`category-${category.id}`}
          name="name"
          required
          maxLength={40}
          defaultValue={category.name}
          className="h-10 sm:flex-1"
        />
        <Button type="submit" variant="outline" disabled={renamePending}>
          {renamePending ? "Saving…" : "Rename"}
        </Button>
      </form>
      <FormMessage state={renameState} />
      <form action={deleteAction}>
        <input type="hidden" name="categoryId" value={category.id} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={deletePending}
          onClick={(event) => {
            if (!window.confirm("Delete this category? Items in it stay on the wishlist, without a category.")) {
              event.preventDefault();
            }
          }}
        >
          {deletePending ? "Deleting…" : "Delete category"}
        </Button>
      </form>
      <FormMessage state={deleteState} />
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
    <div className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div>
        <h3 className="font-medium">Categories</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Owners and managers set these up. Visitors use them to filter the wishlist.
        </p>
      </div>
      <form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="grow space-y-2">
          <Label htmlFor="category-name">New category</Label>
          <Input id="category-name" name="name" required maxLength={40} placeholder="Gear, travel, studio" className="h-10" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add category"}
        </Button>
      </form>
      <FormMessage state={state} />
      {categories.length > 0 ? (
        <ul className="grid gap-2">
          {categories.map((category) => (
            <CategoryRow key={`${category.id}-${category.name}`} slug={slug} category={category} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      )}
    </div>
  );
}

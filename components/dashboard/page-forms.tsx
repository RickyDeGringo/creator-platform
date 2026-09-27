"use client";

import { useActionState, useRef, useState } from "react";
import { createPage, updatePage } from "@/app/actions/pages";
import { FormMessage } from "@/components/form-message";
import { PhotoField, type PhotoFieldHandle } from "@/components/dashboard/photo-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CoverImage, CreatorPage } from "@/lib/types";

export function CreatePageForm() {
  const [state, action, pending] = useActionState(createPage, null);
  const [preparing, setPreparing] = useState(false);
  const photosRef = useRef<PhotoFieldHandle>(null);

  return (
    <form
      action={(formData) => {
        for (const file of photosRef.current?.files ?? []) formData.append("photos", file);
        action(formData);
      }}
      className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <div className="space-y-2">
        <Label htmlFor="slug">Page link</Label>
        <Input id="slug" name="slug" required minLength={3} maxLength={40} placeholder="your-name" className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" required maxLength={80} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" maxLength={500} className="min-h-20" />
      </div>
      <PhotoField
        id="create-cover-photos"
        label="Cover photos"
        hint="Up to 5. Drop wide shots here — they are cropped to the banner, never stretched."
        revision={state}
        onPreparing={setPreparing}
        fieldRef={photosRef}
      />
      <div className="space-y-2">
        <Label htmlFor="cover_image">Cover image URL</Label>
        <Input id="cover_image" name="cover_image" type="url" placeholder="https://" className="h-10" />
        <p className="text-sm text-muted-foreground">Optional. Uploaded photos load faster than a pasted link.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="paypal_link">PayPal link</Label>
        <Input id="paypal_link" name="paypal_link" type="url" placeholder="https://paypal.me/yourname" className="h-10" />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending || preparing}>
        {pending ? "Creating…" : "Create page"}
      </Button>
    </form>
  );
}

export function PageDetailsForm({ page, covers }: { page: CreatorPage; covers: CoverImage[] }) {
  const [state, action, pending] = useActionState(updatePage.bind(null, page.slug), null);
  const [preparing, setPreparing] = useState(false);
  const photosRef = useRef<PhotoFieldHandle>(null);

  return (
    <form
      action={(formData) => {
        for (const file of photosRef.current?.files ?? []) formData.append("photos", file);
        action(formData);
      }}
      className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" required maxLength={80} defaultValue={page.display_name} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" maxLength={500} defaultValue={page.bio ?? ""} className="min-h-20" />
      </div>
      {covers.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Current cover</legend>
          <ul className="flex gap-2 overflow-x-auto">
            {covers.map((cover, index) => (
              <li key={cover.id} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover.url} alt={`Cover ${index + 1}`} className="h-24 w-36 rounded-lg bg-muted object-cover" />
                <label className="mt-1 flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="remove_cover" value={cover.id} className="size-3.5" />
                  Remove
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      <PhotoField
        id="cover-photos"
        label="Add cover photos"
        hint="Up to 5 in total. Wide shots are cropped to the banner, never stretched."
        revision={state}
        onPreparing={setPreparing}
        fieldRef={photosRef}
      />
      <div className="space-y-2">
        <Label htmlFor="cover_image">Add a cover image URL</Label>
        <Input id="cover_image" name="cover_image" type="url" placeholder="https://" className="h-10" />
        <p className="text-sm text-muted-foreground">Optional extra. Uploaded photos load faster than a pasted link.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="paypal_link">PayPal link</Label>
        <Input id="paypal_link" name="paypal_link" type="url" defaultValue={page.paypal_link ?? ""} placeholder="https://" className="h-10" />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending || preparing}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createPage, updatePage } from "@/app/actions/pages";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreatorPage } from "@/lib/types";

export function CreatePageForm() {
  const [state, action] = useActionState(createPage, null);

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
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
      <div className="space-y-2">
        <Label htmlFor="cover_image">Cover image URL</Label>
        <Input id="cover_image" name="cover_image" type="url" placeholder="https://" className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paypal_link">PayPal link</Label>
        <Input id="paypal_link" name="paypal_link" type="url" placeholder="https://paypal.me/yourname" className="h-10" />
      </div>
      <FormMessage state={state} />
      <Button type="submit">Create page</Button>
    </form>
  );
}

export function PageDetailsForm({ page }: { page: CreatorPage }) {
  const [state, action] = useActionState(updatePage.bind(null, page.slug), null);

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" required maxLength={80} defaultValue={page.display_name} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" maxLength={500} defaultValue={page.bio ?? ""} className="min-h-20" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cover_image">Cover image URL</Label>
        <Input id="cover_image" name="cover_image" type="url" defaultValue={page.cover_image ?? ""} placeholder="https://" className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paypal_link">PayPal link</Label>
        <Input id="paypal_link" name="paypal_link" type="url" defaultValue={page.paypal_link ?? ""} placeholder="https://" className="h-10" />
      </div>
      <FormMessage state={state} />
      <Button type="submit">Save details</Button>
    </form>
  );
}

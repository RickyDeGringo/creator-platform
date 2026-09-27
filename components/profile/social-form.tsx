"use client";

import { useActionState } from "react";
import { updateSocials } from "@/app/actions/profile";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SocialProfiles } from "@/lib/types";

const FIELDS = [
  { id: "tiktok", label: "TikTok", placeholder: "@yourname or https://www.tiktok.com/@yourname" },
  { id: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourname" },
  { id: "x", label: "X", placeholder: "@yourname or https://x.com/yourname" },
  { id: "instagram", label: "Instagram", placeholder: "@yourname or https://www.instagram.com/yourname" },
] as const;

export function SocialForm({ profiles }: { profiles: SocialProfiles }) {
  const [state, action, pending] = useActionState(updateSocials, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social profiles</CardTitle>
        <CardDescription>These show next to your name on comments.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                name={field.id}
                type="text"
                inputMode="url"
                maxLength={200}
                defaultValue={profiles[field.id] ?? ""}
                placeholder={field.placeholder}
                className="h-10"
              />
            </div>
          ))}
          <FormMessage state={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profiles"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState } from "react";
import { addPageManager, removePageManager } from "@/app/actions/members";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PageMember, PageRole } from "@/lib/types";

export function MemberManager({
  slug,
  role,
  members,
}: {
  slug: string;
  role: PageRole;
  members: PageMember[];
}) {
  const [added, addAction] = useActionState(addPageManager.bind(null, slug), null);
  const [removed, removeAction] = useActionState(removePageManager.bind(null, slug), null);
  const isOwner = role === "owner";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium">Current managers</h3>
        {members.length === 0 ? <p className="text-sm text-muted-foreground">No managers yet.</p> : null}
        <div className="grid gap-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
            >
              <p className="text-sm font-medium">@{member.username}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{member.role}</Badge>
                {isOwner && member.role === "manager" ? (
                  <form action={removeAction}>
                    <input type="hidden" name="userId" value={member.userId} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FormMessage state={removed} />

      {isOwner ? (
        <form action={addAction} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <h3 className="font-medium">Add a manager</h3>
            <p className="text-sm text-muted-foreground">
              Use the email they signed up with. They can edit this page. You stay the owner.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager-email">Email</Label>
            <Input
              id="manager-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              maxLength={320}
              placeholder="name@example.com"
              className="h-10"
            />
          </div>
          <FormMessage state={added} />
          <Button type="submit">Add manager</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">The page owner adds and removes managers.</p>
      )}
    </div>
  );
}

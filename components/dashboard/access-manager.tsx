"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createAccessCode, deleteAccessCode, grantAccess } from "@/app/actions/access";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { AccessCode } from "@/lib/types";

function DurationField({ id }: { id: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Duration</Label>
      <select
        id={id}
        name="duration_days"
        defaultValue="30"
        className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground"
      >
        <option value="7">7 days</option>
        <option value="30">30 days</option>
        <option value="90">90 days</option>
      </select>
    </div>
  );
}

function CopyCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function AccessManager({ slug, codes }: { slug: string; codes: AccessCode[] }) {
  const [created, createAction] = useActionState(createAccessCode.bind(null, slug), null);
  const [granted, grantAction] = useActionState(grantAccess.bind(null, slug), null);
  const [removed, deleteAction] = useActionState(deleteAccessCode.bind(null, slug), null);

  return (
    <div className="space-y-6">
      <form action={createAction} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <h3 className="font-medium">Generate a one-time code</h3>
          <p className="text-sm text-muted-foreground">Each code unlocks this page for one account.</p>
        </div>
        <DurationField id="code-duration" />
        <FormMessage state={created} />
        {created?.code ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2">
            <code className="font-mono text-sm tracking-wide">{created.code}</code>
            <CopyCode value={created.code} />
          </div>
        ) : null}
        <Button type="submit">Generate code</Button>
      </form>

      <form action={grantAction} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <h3 className="font-medium">Grant access</h3>
          <p className="text-sm text-muted-foreground">Search by the exact username and choose a duration.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" required minLength={3} maxLength={30} placeholder="viewername" className="h-10" />
        </div>
        <DurationField id="grant-duration" />
        <FormMessage state={granted} />
        <Button type="submit">Grant access</Button>
      </form>

      <FormMessage state={removed} />
      <div className="grid gap-2">
        {codes.length === 0 ? <p className="text-sm text-muted-foreground">No codes yet.</p> : null}
        {codes.map((code) => (
          <div key={code.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
            <div>
              <code className="font-mono text-sm">{code.code_string}</code>
              <p className="text-xs text-muted-foreground">
                {code.duration_days} days · {formatDate(code.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={code.is_redeemed ? "outline" : "secondary"}>
                {code.is_redeemed ? "Redeemed" : "Available"}
              </Badge>
              {code.is_redeemed ? null : (
                <form action={deleteAction}>
                  <input type="hidden" name="codeId" value={code.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete
                  </Button>
                </form>
              )}
              <CopyCode value={code.code_string} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

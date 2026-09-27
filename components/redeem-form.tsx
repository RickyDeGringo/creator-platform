"use client";

import { useActionState } from "react";
import { redeemCode } from "@/app/actions/redeem";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RedeemForm() {
  const [state, action, pending] = useActionState(redeemCode, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Access code</Label>
        <Input
          id="code"
          name="code"
          required
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ABC123XYZ"
          className="h-10 font-mono tracking-wide uppercase"
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Checking…" : "Redeem"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/actions/profile";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Enter your current password, then choose a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextPassword">New password</Label>
            <Input
              id="nextPassword"
              name="nextPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10"
            />
          </div>
          <FormMessage state={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

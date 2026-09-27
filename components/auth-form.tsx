"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signInState, signInAction, signInPending] = useActionState(signIn, null);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, null);
  const state = mode === "sign-in" ? signInState : signUpState;
  const pending = mode === "sign-in" ? signInPending : signUpPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "sign-in" ? "Sign in" : "Create an account"}</CardTitle>
        <CardDescription>
          {mode === "sign-in"
            ? "Use the email and password on your Booth account."
            : "Your username is how creators grant you access."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={mode === "sign-in" ? signInAction : signUpAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          {mode === "sign-up" ? (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required minLength={3} maxLength={30} autoComplete="username" placeholder="livehost" className="h-10" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="h-10"
            />
          </div>
          <FormMessage state={state} />
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </CardContent>
    </Card>
  );
}

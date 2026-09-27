import type { Metadata } from "next";
import Link from "next/link";
import { RedeemForm } from "@/components/redeem-form";
import { SetupNotice } from "@/components/setup-notice";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Redeem" };

export default async function RedeemPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <SetupNotice />
      </div>
    );
  }

  const viewer = await getViewer();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Redeem an access code</CardTitle>
          <CardDescription>
            Codes are single use. A valid code extends your access to that creator&apos;s member posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewer ? (
            <RedeemForm />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Sign in before redeeming a code.</p>
              <Link href="/login?next=/redeem" className={buttonVariants({ size: "lg" })}>
                Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

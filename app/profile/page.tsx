import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/profile/password-form";
import { SetupNotice } from "@/components/setup-notice";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-8 px-4 py-12">
        <SetupNotice />
        <PasswordForm />
      </div>
    );
  }

  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/profile");

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-4 py-12">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-5xl">Profile</h1>
          {viewer.isSuperadmin ? <Badge>Superadmin</Badge> : null}
        </div>
        <p className="text-muted-foreground">
          {viewer.username ? `@${viewer.username}` : "Account"}
          {viewer.email ? ` · ${viewer.email}` : ""}
        </p>
      </div>
      <PasswordForm />
    </div>
  );
}

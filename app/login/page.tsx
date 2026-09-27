import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/validators";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const viewer = await getViewer();
  if (viewer) redirect(next);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      {params.error === "confirm" ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          The confirmation link expired or was already used. Sign in if you already confirmed.
        </p>
      ) : null}
      <AuthForm next={next} />
    </div>
  );
}

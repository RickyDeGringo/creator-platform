import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/messages");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="text-sm tracking-[0.2em] text-primary uppercase">Coming soon</p>
      <h1 className="mt-2 font-heading text-5xl leading-none tracking-tight sm:text-6xl">Messages</h1>
      <p className="mt-4 max-w-lg text-lg leading-8 text-muted-foreground">
        Direct messages between you and creators will live here.
      </p>
    </div>
  );
}

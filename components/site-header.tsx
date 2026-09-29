import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Viewer } from "@/lib/types";

export function SiteHeader({
  viewer,
  configured,
}: {
  viewer: Viewer | null;
  configured: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
        <Link href="/" className="inline-flex min-h-11 items-center font-heading text-2xl leading-none tracking-tight">
          Booth
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {viewer ? (
            <>
              <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Home
              </Link>
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Pages
              </Link>
              <Link href="/messages" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Messages
              </Link>
              <Link href="/profile" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Profile
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Home
              </Link>
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
      {configured ? null : (
        <div className="border-t border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm text-foreground">
          Database not connected.{" "}
          <Link href="/preview" className="underline underline-offset-4">
            Preview the UI
          </Link>
        </div>
      )}
    </header>
  );
}

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
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="font-heading text-2xl leading-none tracking-tight">
          Booth
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/redeem" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Redeem
          </Link>
          {viewer ? (
            <>
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Dashboard
              </Link>
              <span className="hidden max-w-32 truncate text-sm text-muted-foreground sm:inline">
                @{viewer.username ?? "account"}
              </span>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Sign in
            </Link>
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

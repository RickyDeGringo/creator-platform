import Link from "next/link";
import { CreatorAvatar } from "@/components/creator/creator-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreatorMatch } from "@/lib/types";

export function FindCreators({
  query,
  results,
  error,
}: {
  query: string;
  results: CreatorMatch[];
  error?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="space-y-3">
        <p className="text-sm tracking-[0.2em] text-primary uppercase">Your feed</p>
        <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-6xl">Following</h1>
        <p className="max-w-lg text-lg leading-8 text-muted-foreground">You don&apos;t currently follow creators.</p>
      </div>

      <form action="/" className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <Label htmlFor="q">Search creators</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Name or link"
            className="h-10"
            autoComplete="off"
          />
          <Button type="submit" size="lg">
            Search
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Try a display name or the slug from their page link.</p>
        )}
      </form>

      {query && results.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No creators match that search.</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="grid gap-2">
          {results.map((creator) => (
            <li key={creator.id}>
              <Link
                href={`/${creator.slug}`}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CreatorAvatar name={creator.displayName} url={creator.avatarUrl} className="size-14" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{creator.displayName}</span>
                  <span className="block truncate text-sm text-muted-foreground">@{creator.slug}</span>
                  {creator.bio ? (
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{creator.bio}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

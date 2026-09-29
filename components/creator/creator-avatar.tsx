import { cn } from "@/lib/utils";

export function creatorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  const letters = `${first}${second}`.toUpperCase();
  return letters || "?";
}

export function CreatorAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center font-heading text-[1.05rem] leading-none">
          {creatorInitials(name)}
        </span>
      )}
    </span>
  );
}

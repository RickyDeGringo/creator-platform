import type { CSSProperties } from "react";
import { brandColor, inkOn } from "@/lib/brand-colors";
import { letterMark, type IconSet, type PageServiceId } from "@/lib/page-links";
import { cn } from "@/lib/utils";
import { ServiceIcon } from "@/components/creator/service-icon";

export function profileFrame(set: IconSet, id: PageServiceId): { className: string; style?: CSSProperties } {
  if (set === "colour") {
    const background = brandColor(id);
    return {
      className: "bg-[var(--mark)] text-[var(--ink)]",
      style: { "--mark": background, "--ink": inkOn(background) } as CSSProperties,
    };
  }
  if (set === "solid") return { className: "bg-foreground text-background" };
  if (set === "line") return { className: "text-foreground ring-1 ring-foreground/40" };
  if (set === "letters") return { className: "bg-foreground/8 font-heading text-foreground ring-1 ring-foreground/15" };
  return { className: "bg-foreground/8 text-foreground ring-1 ring-foreground/15" };
}

export function ProfileMark({
  id,
  set,
  className,
}: {
  id: PageServiceId;
  set: IconSet;
  className?: string;
}) {
  const frame = profileFrame(set, id);
  const letters = letterMark(id);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", frame.className, className)}
      style={frame.style}
    >
      {set === "letters" ? (
        <svg viewBox="0 0 24 24" className="size-[78%] overflow-visible" aria-hidden="true">
          <text
            x="12"
            y="12.5"
            textAnchor="middle"
            dominantBaseline="central"
            fill="currentColor"
            fontFamily="inherit"
            fontSize={letters.length > 1 ? 9 : 13}
            fontWeight="600"
          >
            {letters}
          </text>
        </svg>
      ) : (
        <ServiceIcon id={id} set={set} className={set === "line" ? "size-[62%]" : "size-[54%]"} />
      )}
    </span>
  );
}

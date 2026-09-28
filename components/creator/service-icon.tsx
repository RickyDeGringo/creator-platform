import { Globe, Link2, Mail } from "lucide-react";
import type { IconSet, PageServiceId } from "@/lib/page-links";
import { serviceIconPaths } from "@/lib/service-icon-paths";

export function ServiceIcon({
  id,
  set,
  className,
}: {
  id: PageServiceId;
  set: IconSet;
  className?: string;
}) {
  if (id === "website") return <Globe className={className} aria-hidden />;
  if (id === "email") return <Mail className={className} aria-hidden />;

  const marks = id in serviceIconPaths ? serviceIconPaths[id as keyof typeof serviceIconPaths] : null;
  if (!marks) return <Link2 className={className} aria-hidden />;
  const mark = marks[set] ?? marks.brand;
  return (
    <svg viewBox={mark.viewBox} className={className} aria-hidden="true" fill="currentColor">
      {mark.d.map((path, index) => (
        <path key={index} d={path} fillRule="evenodd" clipRule="evenodd" />
      ))}
    </svg>
  );
}

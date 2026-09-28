import { ProfileMark } from "@/components/creator/profile-mark";
import { pageServices, type IconSet, type PageLinks } from "@/lib/page-links";

export function PageLinkRow({ links, iconSet }: { links: PageLinks; iconSet: IconSet }) {
  const items = pageServices.flatMap((service) => {
    const href = links[service.id];
    return href ? [{ ...service, href }] : [];
  });
  if (items.length === 0) return null;

  return (
    <nav aria-label="Profiles" className="mt-5 flex flex-wrap gap-2">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          title={item.label}
          aria-label={item.label}
          target={item.id === "email" ? undefined : "_blank"}
          rel={item.id === "email" ? undefined : "noopener noreferrer"}
          className="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ProfileMark id={item.id} set={iconSet} className="size-12 transition-transform hover:scale-105" />
        </a>
      ))}
    </nav>
  );
}

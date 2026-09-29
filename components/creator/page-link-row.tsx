import { ProfileMark } from "@/components/creator/profile-mark";
import { orderedLinkIds, pageServices, type IconSet, type PageLinks, type PageServiceId } from "@/lib/page-links";

export function PageLinkRow({
  links,
  linksOrder = [],
  iconSet,
}: {
  links: PageLinks;
  linksOrder?: PageServiceId[];
  iconSet: IconSet;
}) {
  const items = orderedLinkIds(links, linksOrder).flatMap((id) => {
    const service = pageServices.find((entry) => entry.id === id);
    const href = links[id];
    return service && href ? [{ ...service, href }] : [];
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

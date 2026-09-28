import { ServiceIcon } from "@/components/creator/service-icon";
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
          className="inline-flex size-12 items-center justify-center rounded-full bg-foreground/8 text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/14"
        >
          <ServiceIcon id={item.id} set={iconSet} className="size-6" />
        </a>
      ))}
    </nav>
  );
}

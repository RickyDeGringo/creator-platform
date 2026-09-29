"use client";

import { useActionState, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { updatePageLinks } from "@/app/actions/pages";
import { PageTheme } from "@/components/creator/page-theme";
import { ProfileMark } from "@/components/creator/profile-mark";
import { usePageDesignChoice } from "@/components/dashboard/page-design-choice";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  iconSets,
  initialLinkOrder,
  isPageService,
  pageServiceGroups,
  pageServices,
  type IconSet,
  type PageLinks,
  type PageServiceId,
} from "@/lib/page-links";
import { pageFont, pagePalette } from "@/lib/page-theme";
import { cn } from "@/lib/utils";

const sampleServices: PageServiceId[] = ["tiktok", "instagram", "youtube", "x", "twitch", "discord", "spotify", "patreon"];

const serviceById = new Map(pageServices.map((service) => [service.id, service]));

export function LinksManager({
  slug,
  links,
  linksOrder,
  iconSet,
  palette,
  font,
}: {
  slug: string;
  links: PageLinks;
  linksOrder: PageServiceId[];
  iconSet: IconSet;
  palette: string;
  font: string;
}) {
  const [state, action, pending] = useActionState(updatePageLinks.bind(null, slug), null);
  const choice = usePageDesignChoice();
  const paletteId = choice?.palette ?? pagePalette(palette);
  const fontId = choice?.font ?? pageFont(font);
  const [setId, setSetId] = useState<IconSet>(iconSet);
  const [open, setOpen] = useState<PageServiceId[]>(() => {
    const ids = pageServices.flatMap((service) => (links[service.id] ? [service.id] : []));
    return initialLinkOrder(links, linksOrder, ids);
  });
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const shown = new Set(open);
  const hidden = pageServiceGroups()
    .map((section) => ({
      ...section,
      services: section.services.filter((service) => !shown.has(service.id)),
    }))
    .filter((section) => section.services.length > 0);

  function showService(id: string) {
    if (!isPageService(id) || shown.has(id)) return;
    setOpen((current) => [...current, id]);
  }

  function removeService(id: PageServiceId) {
    setOpen((current) => current.filter((entry) => entry !== id));
  }

  function moveItem(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= open.length || to >= open.length) return;
    setOpen((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <form action={action} className="space-y-8 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <input type="hidden" name="links_order" value={open.join(",")} readOnly />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Icon style</legend>
        <p className="text-sm text-muted-foreground">
          Five different looks, from official logos to initials in your page type. The preview uses the palette and type
          from Design.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {iconSets.map((set) => (
            <label
              key={set.id}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-xl px-3 py-3 ring-1 ring-foreground/10",
                "has-[:checked]:ring-2 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              )}
            >
              <input
                type="radio"
                name="icon_set"
                value={set.id}
                checked={setId === set.id}
                onChange={() => setSetId(set.id)}
                className="sr-only"
              />
              <span>
                <span className="block text-sm font-medium">{set.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{set.detail}</span>
              </span>
              <IconSetPreview
                set={set.id}
                services={open.length > 0 ? open : sampleServices}
                sample={open.length === 0}
                palette={paletteId}
                font={fontId}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {hidden.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="add-profile">Add a profile</Label>
          <select
            id="add-profile"
            value=""
            onChange={(event) => showService(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground sm:max-w-xs"
          >
            <option value="">Choose a service</option>
            {hidden.map((section) => (
              <optgroup key={section.group} label={section.group}>
                {section.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      ) : null}

      {open.length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="font-heading text-2xl">Profiles</legend>
          <p className="text-sm text-muted-foreground">Drag the handle to set the order on your public page.</p>
          <ul className="space-y-2">
            {open.map((id, index) => {
              const service = serviceById.get(id);
              if (!service) return null;
              return (
                <li
                  key={id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl bg-muted/40 px-2 py-2 ring-1 ring-foreground/10",
                    dragOverIndex === index && "ring-2 ring-primary",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = dragIndex.current;
                    dragIndex.current = null;
                    setDragOverIndex(null);
                    if (from == null) return;
                    moveItem(from, index);
                  }}
                >
                  <button
                    type="button"
                    draggable
                    aria-label={`Drag ${service.label}`}
                    className="inline-flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:cursor-grabbing"
                    onDragStart={(event) => {
                      dragIndex.current = index;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                    }}
                    onDragEnd={() => {
                      dragIndex.current = null;
                      setDragOverIndex(null);
                    }}
                  >
                    <GripVertical className="size-4" aria-hidden="true" />
                  </button>
                  <ProfileMark id={id} set={setId} className="size-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`link-${id}`} className="sr-only">
                      {service.label}
                    </Label>
                    <Input
                      id={`link-${id}`}
                      name={id}
                      type="text"
                      inputMode={id === "email" ? "email" : "url"}
                      maxLength={500}
                      defaultValue={links[id] ?? ""}
                      placeholder={service.placeholder}
                      className="h-10"
                      autoComplete="off"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => removeService(id)}>
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? "Saving…" : "Save links"}
      </Button>
    </form>
  );
}

function IconSetPreview({
  set,
  services,
  sample,
  palette,
  font,
}: {
  set: IconSet;
  services: PageServiceId[];
  sample: boolean;
  palette: ReturnType<typeof pagePalette>;
  font: ReturnType<typeof pageFont>;
}) {
  return (
    <div aria-hidden="true">
      <PageTheme palette={palette} font={font} preview className="rounded-lg px-2 py-2.5">
        <span className="mb-2 block text-center font-heading text-sm leading-none">{sample ? "Sample" : "Your links"}</span>
        <span className="flex flex-wrap justify-center gap-1.5">
          {services.map((id) => (
            <ProfileMark key={id} id={id} set={set} className="size-9" />
          ))}
        </span>
      </PageTheme>
    </div>
  );
}

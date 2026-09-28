"use client";

import { useActionState, useState } from "react";
import { updatePageLinks } from "@/app/actions/pages";
import { ServiceIcon } from "@/components/creator/service-icon";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iconSets, isPageService, pageServiceGroups, pageServices, type IconSet, type PageLinks, type PageServiceId } from "@/lib/page-links";
import { cn } from "@/lib/utils";

export function LinksManager({
  slug,
  links,
  iconSet,
}: {
  slug: string;
  links: PageLinks;
  iconSet: IconSet;
}) {
  const [state, action, pending] = useActionState(updatePageLinks.bind(null, slug), null);
  const [setId, setSetId] = useState<IconSet>(iconSet);
  const [open, setOpen] = useState<PageServiceId[]>(() =>
    pageServices.flatMap((service) => (links[service.id] ? [service.id] : [])),
  );
  const shown = new Set(open);
  const visible = pageServices.filter((service) => shown.has(service.id));
  const groups = pageServiceGroups()
    .map((section) => ({
      ...section,
      services: section.services.filter((service) => shown.has(service.id)),
    }))
    .filter((section) => section.services.length > 0);
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

  return (
    <form action={action} className="space-y-8 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Icon style</legend>
        <p className="text-sm text-muted-foreground">
          These are the brand marks from Simple Icons, Font Awesome, and Bootstrap Icons. A style that has no mark for a
          service falls back to the brand logo, so Kick, OnlyFans, and Ko-fi still show.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
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
              {visible.length > 0 ? (
                <span className="flex flex-wrap gap-1.5 text-foreground" aria-hidden="true">
                  {visible.map((service) => (
                    <ServiceIcon key={service.id} id={service.id} set={set.id} className="size-5" />
                  ))}
                </span>
              ) : null}
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

      {groups.map((section) => (
        <fieldset key={section.group} className="space-y-4">
          <legend className="font-heading text-2xl">{section.group}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.services.map((service) => (
              <div key={service.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`link-${service.id}`} className="flex items-center gap-2">
                    <ServiceIcon id={service.id} set={setId} className="size-4" />
                    {service.label}
                  </Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((current) => current.filter((id) => id !== service.id))}>
                    Remove
                  </Button>
                </div>
                <Input
                  id={`link-${service.id}`}
                  name={service.id}
                  type="text"
                  inputMode={service.id === "email" ? "email" : "url"}
                  maxLength={500}
                  defaultValue={links[service.id] ?? ""}
                  placeholder={service.placeholder}
                  className="h-10"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save links"}
      </Button>
    </form>
  );
}

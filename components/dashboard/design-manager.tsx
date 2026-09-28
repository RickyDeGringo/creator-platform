"use client";

import { useActionState, useState } from "react";
import { updatePageDesign } from "@/app/actions/pages";
import { PageTheme } from "@/components/creator/page-theme";
import { usePageDesignChoice } from "@/components/dashboard/page-design-choice";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { pageFonts, pagePalettes, pageFont, pagePalette, type PageFont, type PagePalette } from "@/lib/page-theme";
import { pageFontVariables } from "@/lib/page-fonts";
import { cn } from "@/lib/utils";

export function DesignManager({
  slug,
  displayName,
  bio,
  palette,
  font,
}: {
  slug: string;
  displayName: string;
  bio: string | null;
  palette: string;
  font: string;
}) {
  const [state, action, pending] = useActionState(updatePageDesign.bind(null, slug), null);
  const choice = usePageDesignChoice();
  const [paletteId, setPaletteId] = useState<PagePalette>(pagePalette(palette));
  const [fontId, setFontId] = useState<PageFont>(pageFont(font));
  const paletteValue = choice?.palette ?? paletteId;
  const fontValue = choice?.font ?? fontId;

  function choosePalette(id: PagePalette) {
    if (choice) choice.setPalette(id);
    else setPaletteId(id);
  }

  function chooseFont(id: PageFont) {
    if (choice) choice.setFont(id);
    else setFontId(id);
  }

  return (
    <div className={pageFontVariables}>
      <p className="mb-4 text-sm text-muted-foreground">Pick a palette and a typeface for the public page.</p>
      <div className="grid items-start gap-6 sm:grid-cols-[minmax(0,1fr)_16rem]">
      <form action={action} className="space-y-6 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <fieldset>
          <legend className="text-sm font-medium">Colour palette</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pagePalettes.map((item) => (
              <label
                key={item.id}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 ring-1 ring-foreground/10 has-[:checked]:ring-2 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                )}
              >
                <input
                  type="radio"
                  name="palette"
                  value={item.id}
                  checked={paletteValue === item.id}
                  onChange={() => choosePalette(item.id)}
                  className="sr-only"
                />
                <span
                  className="flex h-10 w-14 shrink-0 flex-col overflow-hidden rounded-md ring-1 ring-white/25"
                  style={{ background: item.background }}
                  aria-hidden
                >
                  <span className="h-3.5" style={{ background: item.primary }} />
                  <span className="mt-auto px-1 pb-1 text-[9px] leading-none" style={{ color: item.foreground }}>
                    Aa
                  </span>
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Type</legend>
          <div className="mt-3 grid gap-2">
            {pageFonts.map((item) => (
              <label
                key={item.id}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 ring-1 ring-foreground/10 has-[:checked]:ring-2 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="font"
                  value={item.id}
                  checked={fontValue === item.id}
                  onChange={() => chooseFont(item.id)}
                  className="sr-only"
                />
                <span>
                  <span className="block text-lg leading-none" style={{ fontFamily: item.heading }}>
                    {item.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground" style={{ fontFamily: item.body }}>
                    {item.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <FormMessage state={state} />
        <Button type="submit" disabled={pending} className="h-12 w-full text-base">
          {pending ? "Saving…" : "Save design"}
        </Button>
      </form>

      <aside aria-label="Page preview" className="max-sm:order-first sm:sticky sm:top-20">
        <p className="mb-2 text-sm font-medium">Preview</p>
        <PageTheme palette={paletteValue} font={fontValue} preview className="overflow-hidden rounded-2xl ring-1 ring-foreground/15">
          <div className="cover-fallback h-16" />
          <div className="px-3 pb-3">
            <p className="mt-2 text-[10px] tracking-wide text-muted-foreground uppercase">@{slug}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <h2 className="min-w-0 font-heading text-3xl leading-none break-words">{displayName}</h2>
              <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground">
                Follow
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-[11px] leading-4">
              {bio?.trim() || "A short bio sits under the name."}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">128 followers</p>
            <div className="mt-3 rounded-xl bg-card px-2.5 py-2 ring-1 ring-foreground/10">
              <p className="font-heading text-lg leading-none">Posts</p>
              <p className="mt-1 text-[11px] leading-4">New saddle</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </PageTheme>
      </aside>
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";

const paletteIds = ["ember", "ink", "paper", "grove", "tide", "plum", "dune", "midnight"] as const;
const fontIds = ["editorial", "newsroom", "story", "gallery", "studio", "letterpress"] as const;

export type PagePalette = (typeof paletteIds)[number];
export type PageFont = (typeof fontIds)[number];

type PaletteTokens = {
  id: PagePalette;
  name: string;
  description: string;
  scheme: "dark" | "light";
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  glow: string;
};

export const pagePalettes: PaletteTokens[] = [
  {
    id: "ember",
    name: "Ember",
    description: "Warm dark, copper",
    scheme: "dark",
    background: "oklch(0.16 0.012 65)",
    foreground: "oklch(0.96 0.015 90)",
    card: "oklch(0.21 0.014 65)",
    primary: "oklch(0.72 0.19 40)",
    primaryForeground: "oklch(0.18 0.03 40)",
    secondary: "oklch(0.28 0.016 65)",
    secondaryForeground: "oklch(0.96 0.015 90)",
    muted: "oklch(0.27 0.014 65)",
    mutedForeground: "oklch(0.74 0.02 80)",
    accent: "oklch(0.32 0.04 45)",
    accentForeground: "oklch(0.96 0.015 90)",
    border: "oklch(0.96 0.02 90 / 12%)",
    input: "oklch(0.96 0.02 90 / 14%)",
    ring: "oklch(0.72 0.19 40)",
    glow: "oklch(0.42 0.09 35 / 0.38)",
  },
  {
    id: "ink",
    name: "Ink",
    description: "Cool black, ice",
    scheme: "dark",
    background: "oklch(0.14 0.012 250)",
    foreground: "oklch(0.96 0.01 250)",
    card: "oklch(0.19 0.016 250)",
    primary: "oklch(0.8 0.11 220)",
    primaryForeground: "oklch(0.16 0.03 250)",
    secondary: "oklch(0.26 0.02 250)",
    secondaryForeground: "oklch(0.96 0.01 250)",
    muted: "oklch(0.25 0.016 250)",
    mutedForeground: "oklch(0.72 0.02 250)",
    accent: "oklch(0.3 0.04 230)",
    accentForeground: "oklch(0.96 0.01 250)",
    border: "oklch(0.96 0.01 250 / 12%)",
    input: "oklch(0.96 0.01 250 / 14%)",
    ring: "oklch(0.8 0.11 220)",
    glow: "oklch(0.45 0.08 230 / 0.35)",
  },
  {
    id: "paper",
    name: "Paper",
    description: "Cream, rust",
    scheme: "light",
    background: "oklch(0.97 0.012 85)",
    foreground: "oklch(0.25 0.02 50)",
    card: "oklch(0.995 0.004 90)",
    primary: "oklch(0.52 0.16 40)",
    primaryForeground: "oklch(0.98 0.01 90)",
    secondary: "oklch(0.93 0.015 80)",
    secondaryForeground: "oklch(0.28 0.02 50)",
    muted: "oklch(0.93 0.012 85)",
    mutedForeground: "oklch(0.45 0.02 55)",
    accent: "oklch(0.9 0.03 70)",
    accentForeground: "oklch(0.28 0.02 50)",
    border: "oklch(0.25 0.02 50 / 12%)",
    input: "oklch(0.25 0.02 50 / 10%)",
    ring: "oklch(0.52 0.16 40)",
    glow: "oklch(0.86 0.06 55 / 0.85)",
  },
  {
    id: "grove",
    name: "Grove",
    description: "Forest, gold",
    scheme: "dark",
    background: "oklch(0.18 0.03 150)",
    foreground: "oklch(0.95 0.02 120)",
    card: "oklch(0.23 0.035 150)",
    primary: "oklch(0.8 0.14 95)",
    primaryForeground: "oklch(0.22 0.04 140)",
    secondary: "oklch(0.28 0.03 150)",
    secondaryForeground: "oklch(0.95 0.02 120)",
    muted: "oklch(0.27 0.025 150)",
    mutedForeground: "oklch(0.75 0.03 130)",
    accent: "oklch(0.32 0.05 145)",
    accentForeground: "oklch(0.95 0.02 120)",
    border: "oklch(0.95 0.02 120 / 12%)",
    input: "oklch(0.95 0.02 120 / 14%)",
    ring: "oklch(0.8 0.14 95)",
    glow: "oklch(0.4 0.08 145 / 0.42)",
  },
  {
    id: "tide",
    name: "Tide",
    description: "Deep sea, coral",
    scheme: "dark",
    background: "oklch(0.17 0.03 230)",
    foreground: "oklch(0.96 0.01 200)",
    card: "oklch(0.22 0.035 230)",
    primary: "oklch(0.72 0.15 25)",
    primaryForeground: "oklch(0.18 0.04 25)",
    secondary: "oklch(0.28 0.03 230)",
    secondaryForeground: "oklch(0.96 0.01 200)",
    muted: "oklch(0.26 0.025 230)",
    mutedForeground: "oklch(0.75 0.02 210)",
    accent: "oklch(0.32 0.05 220)",
    accentForeground: "oklch(0.96 0.01 200)",
    border: "oklch(0.96 0.01 200 / 12%)",
    input: "oklch(0.96 0.01 200 / 14%)",
    ring: "oklch(0.72 0.15 25)",
    glow: "oklch(0.4 0.08 220 / 0.42)",
  },
  {
    id: "plum",
    name: "Plum",
    description: "Wine, blush",
    scheme: "dark",
    background: "oklch(0.17 0.03 330)",
    foreground: "oklch(0.96 0.015 350)",
    card: "oklch(0.22 0.035 330)",
    primary: "oklch(0.75 0.14 350)",
    primaryForeground: "oklch(0.2 0.04 340)",
    secondary: "oklch(0.28 0.03 330)",
    secondaryForeground: "oklch(0.96 0.015 350)",
    muted: "oklch(0.26 0.025 330)",
    mutedForeground: "oklch(0.76 0.02 340)",
    accent: "oklch(0.32 0.05 330)",
    accentForeground: "oklch(0.96 0.015 350)",
    border: "oklch(0.96 0.015 350 / 12%)",
    input: "oklch(0.96 0.015 350 / 14%)",
    ring: "oklch(0.75 0.14 350)",
    glow: "oklch(0.42 0.1 340 / 0.4)",
  },
  {
    id: "dune",
    name: "Dune",
    description: "Sand, clay",
    scheme: "light",
    background: "oklch(0.94 0.02 80)",
    foreground: "oklch(0.28 0.03 50)",
    card: "oklch(0.97 0.012 85)",
    primary: "oklch(0.48 0.11 45)",
    primaryForeground: "oklch(0.98 0.01 85)",
    secondary: "oklch(0.9 0.025 75)",
    secondaryForeground: "oklch(0.3 0.03 50)",
    muted: "oklch(0.9 0.02 80)",
    mutedForeground: "oklch(0.45 0.03 55)",
    accent: "oklch(0.88 0.04 70)",
    accentForeground: "oklch(0.3 0.03 50)",
    border: "oklch(0.28 0.03 50 / 12%)",
    input: "oklch(0.28 0.03 50 / 10%)",
    ring: "oklch(0.48 0.11 45)",
    glow: "oklch(0.82 0.06 70 / 0.7)",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Navy, amber",
    scheme: "dark",
    background: "oklch(0.15 0.03 265)",
    foreground: "oklch(0.96 0.01 90)",
    card: "oklch(0.2 0.035 265)",
    primary: "oklch(0.8 0.14 80)",
    primaryForeground: "oklch(0.2 0.04 70)",
    secondary: "oklch(0.26 0.03 265)",
    secondaryForeground: "oklch(0.96 0.01 90)",
    muted: "oklch(0.25 0.025 265)",
    mutedForeground: "oklch(0.74 0.02 90)",
    accent: "oklch(0.3 0.04 265)",
    accentForeground: "oklch(0.96 0.01 90)",
    border: "oklch(0.96 0.01 90 / 12%)",
    input: "oklch(0.96 0.01 90 / 14%)",
    ring: "oklch(0.8 0.14 80)",
    glow: "oklch(0.38 0.08 265 / 0.48)",
  },
];

export const pageFonts = [
  {
    id: "editorial",
    name: "Editorial",
    description: "Serif headlines, plain sans",
    heading: "var(--font-instrument), ui-serif, Georgia, serif",
    body: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "newsroom",
    name: "Newsroom",
    description: "Newspaper headlines",
    heading: "var(--font-newsreader), ui-serif, Georgia, serif",
    body: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "story",
    name: "Story",
    description: "Soft serif, rounded text",
    heading: "var(--font-fraunces), ui-serif, Georgia, serif",
    body: "var(--font-nunito), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "gallery",
    name: "Gallery",
    description: "Fine serif, wide sans",
    heading: "var(--font-cormorant), ui-serif, Georgia, serif",
    body: "var(--font-outfit), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "studio",
    name: "Studio",
    description: "Geometric display",
    heading: "var(--font-syne), ui-sans-serif, system-ui, sans-serif",
    body: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "letterpress",
    name: "Letterpress",
    description: "Book type",
    heading: "var(--font-libre), ui-serif, Georgia, serif",
    body: "var(--font-source-sans), ui-sans-serif, system-ui, sans-serif",
  },
] as const;

const paletteById = Object.fromEntries(pagePalettes.map((palette) => [palette.id, palette])) as Record<
  PagePalette,
  PaletteTokens
>;

const fontById = Object.fromEntries(pageFonts.map((font) => [font.id, font])) as Record<
  PageFont,
  (typeof pageFonts)[number]
>;

export function isPagePalette(value: unknown): value is PagePalette {
  return typeof value === "string" && (paletteIds as readonly string[]).includes(value);
}

export function isPageFont(value: unknown): value is PageFont {
  return typeof value === "string" && (fontIds as readonly string[]).includes(value);
}

export function pagePalette(value: unknown): PagePalette {
  return isPagePalette(value) ? value : "ember";
}

export function pageFont(value: unknown): PageFont {
  return isPageFont(value) ? value : "editorial";
}

export function paletteStyle(id: PagePalette): CSSProperties {
  const theme = paletteById[id];
  const font = fontById.editorial;
  return {
    colorScheme: theme.scheme,
    ["--background" as string]: theme.background,
    ["--foreground" as string]: theme.foreground,
    ["--card" as string]: theme.card,
    ["--card-foreground" as string]: theme.foreground,
    ["--popover" as string]: theme.card,
    ["--popover-foreground" as string]: theme.foreground,
    ["--primary" as string]: theme.primary,
    ["--primary-foreground" as string]: theme.primaryForeground,
    ["--secondary" as string]: theme.secondary,
    ["--secondary-foreground" as string]: theme.secondaryForeground,
    ["--muted" as string]: theme.muted,
    ["--muted-foreground" as string]: theme.mutedForeground,
    ["--accent" as string]: theme.accent,
    ["--accent-foreground" as string]: theme.accentForeground,
    ["--border" as string]: theme.border,
    ["--input" as string]: theme.input,
    ["--ring" as string]: theme.ring,
    ["--page-glow" as string]: theme.glow,
    ["--page-heading" as string]: font.heading,
    ["--page-body" as string]: font.body,
  };
}

export function themeStyle(palette: PagePalette, font: PageFont): CSSProperties {
  const face = fontById[font];
  return {
    ...paletteStyle(palette),
    ["--page-heading" as string]: face.heading,
    ["--page-body" as string]: face.body,
  };
}

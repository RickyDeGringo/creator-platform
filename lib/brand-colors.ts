import type { PageServiceId } from "@/lib/page-links";

const brandColors: Record<PageServiceId, string> = {
  website: "#3b6cff",
  email: "#e23b3b",
  tiktok: "#111111",
  instagram: "#e1306c",
  youtube: "#ff0033",
  x: "#111111",
  facebook: "#0866ff",
  snapchat: "#fffc00",
  threads: "#111111",
  bluesky: "#1185fe",
  linkedin: "#0a66c2",
  pinterest: "#e60023",
  reddit: "#ff4500",
  twitch: "#9146ff",
  kick: "#53fc18",
  discord: "#5865f2",
  whatsapp: "#25d366",
  telegram: "#229ed9",
  onlyfans: "#00aff0",
  fansly: "#2f8cff",
  patreon: "#ff424d",
  kofi: "#ff5e5b",
  amazon: "#ff9900",
  spotify: "#1db954",
  soundcloud: "#ff5500",
  applemusic: "#fa243c",
  bandcamp: "#1da0c3",
};

export function brandColor(id: PageServiceId) {
  return brandColors[id];
}

export function inkOn(hex: string) {
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16) / 255;
  const linear = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(channel(1)) + 0.7152 * linear(channel(3)) + 0.0722 * linear(channel(5));
  return luminance > 0.62 ? "#111111" : "#ffffff";
}

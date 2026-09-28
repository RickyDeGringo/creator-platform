export const iconSets = [
  {
    id: "brand",
    label: "Logos",
    detail: "Official marks, drawn in your page colour.",
  },
  {
    id: "colour",
    label: "Colour",
    detail: "Each logo on a disc of its own colour.",
  },
  {
    id: "line",
    label: "Line",
    detail: "Thin outlines, all one weight.",
  },
  {
    id: "solid",
    label: "Bold",
    detail: "Heavy shapes on a solid disc.",
  },
  {
    id: "letters",
    label: "Letters",
    detail: "Initials set in your page type.",
  },
] as const;

export type IconSet = (typeof iconSets)[number]["id"];

export const pageServices = [
  { id: "website", label: "Website", group: "Web", placeholder: "https://yoursite.com" },
  { id: "email", label: "Email", group: "Web", placeholder: "you@example.com" },
  { id: "tiktok", label: "TikTok", group: "Social", placeholder: "@yourname" },
  { id: "instagram", label: "Instagram", group: "Social", placeholder: "@yourname" },
  { id: "youtube", label: "YouTube", group: "Social", placeholder: "@yourchannel" },
  { id: "x", label: "X", group: "Social", placeholder: "@yourname" },
  { id: "facebook", label: "Facebook", group: "Social", placeholder: "facebook.com/yourname" },
  { id: "snapchat", label: "Snapchat", group: "Social", placeholder: "@yourname" },
  { id: "threads", label: "Threads", group: "Social", placeholder: "@yourname" },
  { id: "bluesky", label: "Bluesky", group: "Social", placeholder: "you.bsky.social" },
  { id: "linkedin", label: "LinkedIn", group: "Social", placeholder: "linkedin.com/in/yourname" },
  { id: "pinterest", label: "Pinterest", group: "Social", placeholder: "pinterest.com/yourname" },
  { id: "reddit", label: "Reddit", group: "Social", placeholder: "u/yourname" },
  { id: "twitch", label: "Twitch", group: "Live and chat", placeholder: "twitch.tv/yourname" },
  { id: "kick", label: "Kick", group: "Live and chat", placeholder: "kick.com/yourname" },
  { id: "discord", label: "Discord", group: "Live and chat", placeholder: "discord.gg/invite" },
  { id: "whatsapp", label: "WhatsApp", group: "Live and chat", placeholder: "+1 555 0100" },
  { id: "telegram", label: "Telegram", group: "Live and chat", placeholder: "@yourname" },
  { id: "onlyfans", label: "OnlyFans", group: "Support", placeholder: "onlyfans.com/yourname" },
  { id: "fansly", label: "Fansly", group: "Support", placeholder: "fansly.com/yourname" },
  { id: "patreon", label: "Patreon", group: "Support", placeholder: "patreon.com/yourname" },
  { id: "kofi", label: "Ko-fi", group: "Support", placeholder: "ko-fi.com/yourname" },
  { id: "amazon", label: "Amazon wishlist", group: "Support", placeholder: "https://www.amazon.com/hz/wishlist/..." },
  { id: "spotify", label: "Spotify", group: "Music", placeholder: "https://open.spotify.com/artist/..." },
  { id: "soundcloud", label: "SoundCloud", group: "Music", placeholder: "soundcloud.com/yourname" },
  { id: "applemusic", label: "Apple Music", group: "Music", placeholder: "https://music.apple.com/..." },
  { id: "bandcamp", label: "Bandcamp", group: "Music", placeholder: "yourname.bandcamp.com" },
] as const;

export type PageServiceId = (typeof pageServices)[number]["id"];
export type PageLinks = Partial<Record<PageServiceId, string>>;

const serviceIds = new Set<string>(pageServices.map((service) => service.id));
const groups = ["Web", "Social", "Live and chat", "Support", "Music"] as const;

export function pageServiceGroups() {
  return groups.map((group) => ({
    group,
    services: pageServices.filter((service) => service.group === group),
  }));
}

export function isIconSet(value: unknown): value is IconSet {
  return iconSets.some((set) => set.id === value);
}

const retiredIconSets: Record<string, IconSet> = {
  fontawesome: "brand",
  bootstrap: "brand",
};

export function pageIconSet(value: unknown): IconSet {
  if (typeof value === "string" && value in retiredIconSets) return retiredIconSets[value];
  return isIconSet(value) ? value : "brand";
}

export function letterMark(id: PageServiceId) {
  const marks: Record<PageServiceId, string> = {
    website: "W",
    email: "@",
    tiktok: "Tt",
    instagram: "Ig",
    youtube: "Yt",
    x: "X",
    facebook: "Fb",
    snapchat: "Sn",
    threads: "Th",
    bluesky: "Bs",
    linkedin: "In",
    pinterest: "Pt",
    reddit: "Rd",
    twitch: "Tw",
    kick: "K",
    discord: "Ds",
    whatsapp: "Wa",
    telegram: "Tg",
    onlyfans: "Of",
    fansly: "Fs",
    patreon: "Pa",
    kofi: "Kf",
    amazon: "Az",
    spotify: "Sp",
    soundcloud: "Sc",
    applemusic: "Am",
    bandcamp: "Bc",
  };
  return marks[id];
}

export function isPageService(value: string): value is PageServiceId {
  return serviceIds.has(value);
}

export function serviceLabel(id: PageServiceId) {
  return pageServices.find((service) => service.id === id)?.label ?? id;
}

export function parsePageLink(id: PageServiceId, raw: string): { url: string | null } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: null };
  if (trimmed.length > 500) return { error: `Keep the ${serviceLabel(id)} link under 500 characters.` };
  if (id === "website") return parseWebsite(trimmed);
  if (id === "email") return parseEmail(trimmed);
  if (id === "whatsapp") return parseWhatsapp(trimmed);
  if (id === "amazon") return parseAmazon(trimmed);
  if (id === "discord") return parseDiscord(trimmed);
  if (id === "spotify") return parseSpotify(trimmed);
  if (id === "applemusic") return parseAppleMusic(trimmed);
  if (id === "youtube") return parseYoutube(trimmed);
  if (id === "bandcamp") return parseBandcamp(trimmed);
  if (id === "bluesky") return parseBluesky(trimmed);
  if (id === "linkedin") return parseLinkedin(trimmed);
  if (id === "reddit") return parseReddit(trimmed);
  if (id === "snapchat") return parseSnapchat(trimmed);
  return parseProfile(id, trimmed);
}

export function pageLinksFrom(value: unknown): PageLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const links: PageLinks = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isPageService(key) || typeof raw !== "string") continue;
    const parsed = parsePageLink(key, raw);
    if ("url" in parsed && parsed.url) links[key] = parsed.url;
  }
  return links;
}

const HANDLE = /^[\w.]{1,50}$/;
const SLUG = /^[\w.-]{1,80}$/;

const profiles: Record<
  "facebook" | "instagram" | "x" | "tiktok" | "twitch" | "kick" | "telegram" | "threads" | "pinterest" | "soundcloud" | "patreon" | "kofi" | "onlyfans" | "fansly",
  { hosts: string[]; reserved: string[]; canonical: (handle: string) => string }
> = {
  facebook: {
    hosts: ["facebook.com", "fb.com"],
    reserved: ["share", "watch", "reel", "stories", "groups", "events", "profile.php"],
    canonical: (handle) => `https://www.facebook.com/${handle}`,
  },
  instagram: {
    hosts: ["instagram.com"],
    reserved: ["p", "reel", "reels", "stories", "explore", "accounts"],
    canonical: (handle) => `https://www.instagram.com/${handle}`,
  },
  x: {
    hosts: ["x.com", "twitter.com"],
    reserved: ["i", "intent", "share", "home", "search", "settings"],
    canonical: (handle) => `https://x.com/${handle}`,
  },
  tiktok: {
    hosts: ["tiktok.com"],
    reserved: ["foryou", "following", "live"],
    canonical: (handle) => `https://www.tiktok.com/@${handle}`,
  },
  twitch: { hosts: ["twitch.tv"], reserved: ["directory", "settings", "videos"], canonical: (handle) => `https://www.twitch.tv/${handle}` },
  kick: { hosts: ["kick.com"], reserved: ["browse", "categories"], canonical: (handle) => `https://kick.com/${handle}` },
  telegram: { hosts: ["t.me", "telegram.me"], reserved: ["share", "joinchat", "addstickers"], canonical: (handle) => `https://t.me/${handle}` },
  threads: { hosts: ["threads.net", "threads.com"], reserved: ["search", "login"], canonical: (handle) => `https://www.threads.net/@${handle}` },
  pinterest: { hosts: ["pinterest.com"], reserved: ["pin", "ideas", "search"], canonical: (handle) => `https://www.pinterest.com/${handle}` },
  soundcloud: { hosts: ["soundcloud.com"], reserved: ["discover", "search", "you"], canonical: (handle) => `https://soundcloud.com/${handle}` },
  patreon: { hosts: ["patreon.com"], reserved: ["login", "posts", "checkout"], canonical: (handle) => `https://www.patreon.com/${handle}` },
  kofi: { hosts: ["ko-fi.com"], reserved: ["home", "explore"], canonical: (handle) => `https://ko-fi.com/${handle}` },
  onlyfans: { hosts: ["onlyfans.com"], reserved: ["posts", "my"], canonical: (handle) => `https://onlyfans.com/${handle}` },
  fansly: { hosts: ["fansly.com"], reserved: ["posts", "login"], canonical: (handle) => `https://fansly.com/${handle}` },
};

function parseProfile(id: PageServiceId, raw: string): { url: string | null } | { error: string } {
  if (!(id in profiles)) return { error: `That ${serviceLabel(id)} link is not valid.` };
  const rule = profiles[id as keyof typeof profiles];
  if (!looksLikeUrl(raw)) {
    const handle = raw.replace(/^@/, "");
    if (!HANDLE.test(handle)) return { error: `That ${serviceLabel(id)} username looks off.` };
    return { url: rule.canonical(handle) };
  }
  const url = asHttps(raw, serviceLabel(id));
  if ("error" in url) return url;
  if (!rule.hosts.includes(bareHost(url))) return { error: `Use a ${serviceLabel(id)} link.` };
  if (id === "facebook" && url.pathname === "/profile.php") {
    const profileId = url.searchParams.get("id");
    if (!profileId || !/^\d{1,20}$/.test(profileId)) return { error: "Use a Facebook profile link." };
    return { url: `https://www.facebook.com/profile.php?id=${profileId}` };
  }
  const handle = oneSegment(url);
  if (!handle || rule.reserved.includes(handle.toLowerCase()) || !HANDLE.test(handle)) {
    return { error: `Use a ${serviceLabel(id)} profile, not a post.` };
  }
  return { url: rule.canonical(handle) };
}

function parseWebsite(raw: string): { url: string | null } | { error: string } {
  const url = asHttps(raw, "Website");
  if ("error" in url) return url;
  if (!url.hostname.includes(".")) return { error: "Use a full website link." };
  url.hash = "";
  return { url: url.toString() };
}

function parseEmail(raw: string): { url: string | null } | { error: string } {
  const address = raw.replace(/^mailto:/i, "").split("?")[0]?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { error: "Use an email address." };
  return { url: `mailto:${address}` };
}

function parseWhatsapp(raw: string): { url: string | null } | { error: string } {
  if (!looksLikeUrl(raw)) {
    const phone = digits(raw);
    if (!phone) return { error: "Use a WhatsApp number with the country code." };
    return { url: `https://wa.me/${phone}` };
  }
  const url = asHttps(raw, "WhatsApp");
  if ("error" in url) return url;
  const host = bareHost(url);
  const fromPath = host === "wa.me" ? url.pathname.split("/").filter(Boolean)[0] : "";
  const fromQuery = host === "api.whatsapp.com" || host === "whatsapp.com" ? url.searchParams.get("phone") : "";
  const phone = digits(fromPath || fromQuery || "");
  if (!phone) return { error: "Use a WhatsApp chat link or phone number." };
  return { url: `https://wa.me/${phone}` };
}

function parseAmazon(raw: string): { url: string | null } | { error: string } {
  const url = asHttps(raw, "Amazon wishlist");
  if ("error" in url) return url;
  const host = bareHost(url);
  const short = host === "amzn.to" || host === "a.co" || host === "amzn.eu";
  const shop = /^amazon\.(com|co\.uk|ca|de|fr|it|es|co\.jp|com\.au|com\.br|in|nl|se|pl|sg|ae|sa|com\.mx|com\.tr)$/.test(host);
  if (!short && !shop) return { error: "Use an Amazon wishlist link." };
  const path = `${url.pathname}${url.search}`.toLowerCase();
  if (!short && !/wishlist|registry|registries/.test(path)) return { error: "Use an Amazon wishlist or registry link." };
  url.hash = "";
  return { url: url.toString() };
}

function parseDiscord(raw: string): { url: string | null } | { error: string } {
  if (!looksLikeUrl(raw)) {
    if (!/^[\w-]{2,32}$/.test(raw)) return { error: "Paste a Discord invite link." };
    return { url: `https://discord.gg/${raw}` };
  }
  const url = asHttps(raw, "Discord");
  if ("error" in url) return url;
  const host = bareHost(url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "discord.gg" && /^[\w-]{2,32}$/.test(parts[0] ?? "")) return { url: `https://discord.gg/${parts[0]}` };
  if (host === "discord.com" && parts[0] === "invite" && /^[\w-]{2,32}$/.test(parts[1] ?? "")) {
    return { url: `https://discord.gg/${parts[1]}` };
  }
  if (host === "discord.com" && parts[0] === "users" && /^\d{5,22}$/.test(parts[1] ?? "")) {
    return { url: `https://discord.com/users/${parts[1]}` };
  }
  return { error: "Use a Discord invite or profile link." };
}

function parseSpotify(raw: string): { url: string | null } | { error: string } {
  const url = asHttps(raw, "Spotify");
  if ("error" in url) return url;
  const host = bareHost(url);
  if (host !== "open.spotify.com" && host !== "spotify.com" && host !== "spotify.link") {
    return { error: "Use a Spotify link." };
  }
  url.hash = "";
  return { url: url.toString() };
}

function parseAppleMusic(raw: string): { url: string | null } | { error: string } {
  const url = asHttps(raw, "Apple Music");
  if ("error" in url) return url;
  if (bareHost(url) !== "music.apple.com") return { error: "Use an Apple Music link." };
  url.hash = "";
  return { url: url.toString() };
}

function parseYoutube(raw: string): { url: string | null } | { error: string } {
  if (!looksLikeUrl(raw)) {
    const handle = raw.replace(/^@/, "");
    if (!SLUG.test(handle)) return { error: "That YouTube channel name looks off." };
    return { url: `https://www.youtube.com/@${handle}` };
  }
  const url = asHttps(raw, "YouTube");
  if ("error" in url) return url;
  if (bareHost(url) !== "youtube.com") return { error: "Use a YouTube channel link, not a video." };
  const parts = url.pathname.split("/").filter(Boolean);
  const head = parts[0] ?? "";
  if (head.startsWith("@") && SLUG.test(head.slice(1))) return { url: `https://www.youtube.com/${head}` };
  if ((head === "c" || head === "user") && SLUG.test(parts[1] ?? "")) return { url: `https://www.youtube.com/${head}/${parts[1]}` };
  if (head === "channel" && /^UC[\w-]{10,}$/.test(parts[1] ?? "")) return { url: `https://www.youtube.com/channel/${parts[1]}` };
  return { error: "Use a YouTube channel link, not a video." };
}

function parseBandcamp(raw: string): { url: string | null } | { error: string } {
  if (!looksLikeUrl(raw)) {
    const name = raw.replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9-]{1,50}$/.test(name)) return { error: "That Bandcamp name looks off." };
    return { url: `https://${name}.bandcamp.com/` };
  }
  const url = asHttps(raw, "Bandcamp");
  if ("error" in url) return url;
  const host = bareHost(url);
  if (host.endsWith(".bandcamp.com") && host !== "bandcamp.com") return { url: `https://${host}/` };
  const artist = oneSegment(url);
  if (host === "bandcamp.com" && artist && /^[a-z0-9-]{1,50}$/i.test(artist)) return { url: `https://${artist.toLowerCase()}.bandcamp.com/` };
  return { error: "Use a Bandcamp artist link." };
}

function parseBluesky(raw: string): { url: string | null } | { error: string } {
  if (!looksLikeUrl(raw)) {
    const handle = raw.replace(/^@/, "").toLowerCase();
    const full = handle.includes(".") ? handle : `${handle}.bsky.social`;
    if (!/^[a-z0-9.-]{1,80}$/.test(full)) return { error: "That Bluesky handle looks off." };
    return { url: `https://bsky.app/profile/${full}` };
  }
  const url = asHttps(raw, "Bluesky");
  if ("error" in url) return url;
  if (bareHost(url) !== "bsky.app") return { error: "Use a Bluesky profile link." };
  const parts = url.pathname.split("/").filter(Boolean);
  const handle = parts[0] === "profile" ? parts[1] : "";
  if (!handle || !/^[a-z0-9.-]{1,80}$/i.test(handle)) return { error: "Use a Bluesky profile link." };
  return { url: `https://bsky.app/profile/${handle}` };
}

function parseLinkedin(raw: string): { url: string | null } | { error: string } {
  if (!looksLikeUrl(raw)) {
    const handle = raw.replace(/^@/, "");
    if (!SLUG.test(handle)) return { error: "That LinkedIn name looks off." };
    return { url: `https://www.linkedin.com/in/${handle}` };
  }
  const url = asHttps(raw, "LinkedIn");
  if ("error" in url) return url;
  if (bareHost(url) !== "linkedin.com") return { error: "Use a LinkedIn profile link." };
  const parts = url.pathname.split("/").filter(Boolean);
  if ((parts[0] === "in" || parts[0] === "company") && SLUG.test(parts[1] ?? "")) {
    return { url: `https://www.linkedin.com/${parts[0]}/${parts[1]}` };
  }
  return { error: "Use a LinkedIn profile link." };
}

function parseReddit(raw: string): { url: string | null } | { error: string } {
  const cleaned = raw.replace(/^(u\/|user\/)/i, "").replace(/^@/, "");
  if (!looksLikeUrl(raw)) {
    if (!/^[\w-]{1,30}$/.test(cleaned)) return { error: "That Reddit username looks off." };
    return { url: `https://www.reddit.com/user/${cleaned}` };
  }
  const url = asHttps(raw, "Reddit");
  if ("error" in url) return url;
  if (bareHost(url) !== "reddit.com") return { error: "Use a Reddit profile link." };
  const parts = url.pathname.split("/").filter(Boolean);
  const name = parts[0] === "user" || parts[0] === "u" ? parts[1] : "";
  if (!name || !/^[\w-]{1,30}$/.test(name)) return { error: "Use a Reddit profile, not a post." };
  return { url: `https://www.reddit.com/user/${name}` };
}

function parseSnapchat(raw: string): { url: string | null } | { error: string } {
  if (!looksLikeUrl(raw)) {
    const handle = raw.replace(/^@/, "");
    if (!/^[\w.]{1,30}$/.test(handle)) return { error: "That Snapchat username looks off." };
    return { url: `https://www.snapchat.com/add/${handle}` };
  }
  const url = asHttps(raw, "Snapchat");
  if ("error" in url) return url;
  if (bareHost(url) !== "snapchat.com") return { error: "Use a Snapchat profile link." };
  const parts = url.pathname.split("/").filter(Boolean);
  const handle = parts[0] === "add" ? parts[1] : parts[0];
  if (!handle || !/^[\w.]{1,30}$/.test(handle) || handle.toLowerCase() === "add") {
    return { error: "Use a Snapchat profile link." };
  }
  return { url: `https://www.snapchat.com/add/${handle}` };
}

function looksLikeUrl(value: string) {
  return /^(https?:\/\/)/i.test(value) || /^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(value);
}

function bareHost(url: URL) {
  return url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
}

function oneSegment(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return "";
  return parts[0].replace(/^@/, "");
}

function digits(value: string) {
  const phone = value.replace(/[^\d]/g, "");
  return phone.length >= 8 && phone.length <= 15 ? phone : "";
}

function asHttps(raw: string, label: string): URL | { error: string } {
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (!href.toLowerCase().startsWith("https://")) return { error: `${label} links have to start with https://.` };
  try {
    return new URL(href);
  } catch {
    return { error: `That ${label} link is not valid.` };
  }
}

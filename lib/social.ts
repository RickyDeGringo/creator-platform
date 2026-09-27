export type SocialKind = "tiktok" | "facebook" | "x" | "instagram";

const LABELS: Record<SocialKind, string> = {
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  instagram: "Instagram",
};

const HOSTS: Record<SocialKind, string[]> = {
  tiktok: ["tiktok.com"],
  facebook: ["facebook.com", "fb.com"],
  x: ["x.com", "twitter.com"],
  instagram: ["instagram.com"],
};

export function socialProfile(kind: SocialKind, raw: string): { url: string | null } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: null };
  if (trimmed.length > 200) return { error: `Keep the ${LABELS[kind]} profile under 200 characters.` };

  if (looksLikeUrl(trimmed)) return profileFromUrl(kind, trimmed);
  return profileFromHandle(kind, trimmed);
}

function looksLikeUrl(value: string) {
  return /^(https?:\/\/)/i.test(value) || /^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(value);
}

function profileFromHandle(kind: SocialKind, value: string): { url: string | null } | { error: string } {
  const handle = value.replace(/^@/, "");
  if (!/^[\w.]{1,50}$/.test(handle)) {
    return { error: `That ${LABELS[kind]} username looks off.` };
  }
  return { url: canonical(kind, handle) };
}

function profileFromUrl(kind: SocialKind, value: string): { url: string | null } | { error: string } {
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  if (!href.toLowerCase().startsWith("https://")) {
    return { error: `${LABELS[kind]} profile links have to start with https://.` };
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { error: `That ${LABELS[kind]} profile link is not valid.` };
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  if (!HOSTS[kind].includes(host)) {
    return { error: `Use a ${LABELS[kind]} profile link.` };
  }

  if (kind === "facebook" && url.pathname === "/profile.php") {
    const id = url.searchParams.get("id");
    if (!id || !/^\d{1,20}$/.test(id)) return { error: "Use a Facebook profile link." };
    return { url: `https://www.facebook.com/profile.php?id=${id}` };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const first = parts[0]?.replace(/^@/, "") ?? "";
  if (!first || reserved(kind, first) || parts.length > 1) {
    return { error: `Use a ${LABELS[kind]} profile, not a post or video.` };
  }
  if (!/^[\w.]{1,50}$/.test(first)) {
    return { error: `That ${LABELS[kind]} profile link is not valid.` };
  }
  return { url: canonical(kind, first) };
}

function reserved(kind: SocialKind, segment: string) {
  const name = segment.toLowerCase();
  if (kind === "instagram") return ["p", "reel", "reels", "stories", "explore", "accounts"].includes(name);
  if (kind === "x") return ["i", "intent", "share", "home", "search", "settings"].includes(name);
  if (kind === "facebook") return ["share", "watch", "reel", "stories", "groups", "events"].includes(name);
  if (kind === "tiktok") return ["foryou", "following", "live"].includes(name);
  return false;
}

function canonical(kind: SocialKind, handle: string) {
  if (kind === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (kind === "instagram") return `https://www.instagram.com/${handle}`;
  if (kind === "x") return `https://x.com/${handle}`;
  return `https://www.facebook.com/${handle}`;
}

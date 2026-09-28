export function asNumber(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(asNumber(value));
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function localDateTimeInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatFollowers(count: number) {
  return count === 1 ? "1 follower" : `${count} followers`;
}

export function httpsUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function paypalMeHandle(link: string | null | undefined) {
  const href = httpsUrl(link);
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const raw = host === "paypal.me" ? parts[0] : host === "paypal.com" ? paypalMeSegment(parts) : undefined;
  if (!raw) return null;
  let handle: string;
  try {
    handle = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,62}$/.test(handle)) return null;
  return handle;
}

function paypalMeSegment(parts: string[]) {
  const index = parts.findIndex((part) => part.toLowerCase() === "paypalme");
  if (index < 0) return undefined;
  return parts[index + 1];
}

export function parseUsd(value: string) {
  const cleaned = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999.99) return null;
  return Math.round(amount * 100) / 100;
}

export function paypalContributeUrl(link: string | null | undefined, amount: number, itemTitle: string) {
  const handle = paypalMeHandle(link);
  if (!handle || !Number.isFinite(amount) || amount <= 0 || amount > 999_999.99) return null;
  const money = amount.toFixed(2);
  const url = new URL(`https://www.paypal.com/paypalme/${encodeURIComponent(handle)}/${money}USD`);
  const title = itemTitle.trim().replace(/\s+/g, " ").slice(0, 127);
  if (title) url.searchParams.set("item_name", title);
  return url.toString();
}

export function progressPercent(current: number | string, target: number | string) {
  const goal = asNumber(target);
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (asNumber(current) / goal) * 100));
}

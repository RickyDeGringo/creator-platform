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

export function supportLink(goalLink: string | null | undefined, fallback: string | null | undefined) {
  const own = httpsUrl(goalLink);
  if (own) return { href: own, label: "Get this" as const };
  const shared = httpsUrl(fallback);
  if (shared) return { href: shared, label: "Donate" as const };
  return null;
}

export function progressPercent(current: number | string, target: number | string) {
  const goal = asNumber(target);
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (asNumber(current) / goal) * 100));
}

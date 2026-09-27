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

export function progressPercent(current: number | string, target: number | string) {
  const goal = asNumber(target);
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (asNumber(current) / goal) * 100));
}

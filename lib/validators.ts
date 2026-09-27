const RESERVED_SLUGS = new Set([
  "login",
  "redeem",
  "dashboard",
  "preview",
  "auth",
  "api",
]);

export function safeNext(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/dashboard";
  }
  return value;
}

export function slugError(value: string) {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40) {
    return "Use 3–40 characters: lowercase letters, numbers, and hyphens.";
  }
  if (RESERVED_SLUGS.has(slug)) return "That link is reserved.";
  return null;
}

export function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export function usernameError(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return "Usernames are 3–30 characters: lowercase letters, numbers, and underscores.";
  }
  return null;
}

export function parseDuration(value: FormDataEntryValue | null): 7 | 30 | 90 | null {
  const n = Number(value);
  if (n === 7 || n === 30 || n === 90) return n;
  return null;
}

export function parseAmount(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n > 9_999_999_999.99) return null;
  return n;
}

export function friendlyDbError(message: string) {
  if (message.includes("invalid_code")) return "That code is not valid.";
  if (message.includes("code_already_redeemed") || message.includes("access_code_already_redeemed")) {
    return "That code has already been used.";
  }
  if (message.includes("not_authenticated")) return "Sign in to continue.";
  if (message.includes("not_authorized")) return "You do not manage this page.";
  if (message.includes("user_not_found")) return "No account uses that username.";
  if (message.includes("invalid_duration")) return "Choose 7, 30, or 90 days.";
  if (message.includes("duplicate key") || message.includes("23505")) {
    return "That value is already taken.";
  }
  if (message.includes("23503")) {
    return "Your profile is not ready yet. Apply supabase/schema.sql, then sign up again.";
  }
  return message;
}

const RESERVED_SLUGS = new Set([
  "login",
  "redeem",
  "dashboard",
  "preview",
  "profile",
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

export function emailError(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function parseDuration(value: FormDataEntryValue | null): 7 | 30 | 90 | null {
  const n = Number(value);
  if (n === 7 || n === 30 || n === 90) return n;
  return null;
}

export function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function categoryNameError(value: string) {
  const name = normalizeCategoryName(value);
  if (name.length < 1 || name.length > 40) return "Category names are 1–40 characters.";
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
  if (message.includes("email_not_found")) {
    return "No account uses that email. They need to sign up first.";
  }
  if (message.includes("profile_missing")) {
    return "That account has no profile yet. Ask them to sign in once, then try again.";
  }
  if (message.includes("already_manager")) return "That account already manages this page.";
  if (message.includes("already_owner")) return "That account already owns this page.";
  if (message.includes("invalid_email")) return "Enter a valid email address.";
  if (message.includes("owner_only")) return "Only the page owner can add or remove managers.";
  if (message.includes("add_page_manager")) {
    return "Adding managers is not available until the latest database migration is applied.";
  }
  if (message.includes("invalid_duration")) return "Choose 7, 30, or 90 days.";
  if (message.includes("duplicate key") || message.includes("23505")) {
    return "That value is already taken.";
  }
  if (message.includes("23503")) {
    return "Your profile is not ready yet. Apply supabase/schema.sql, then sign up again.";
  }
  if (message.includes("too_many_images")) return "A post can show 5 images.";
  if (message.includes("too_many_covers")) return "A cover can show 5 images.";
  if (message.includes("too_many_comments")) return "This post has as many comments as it can hold.";
  if (message.includes("not_following")) return "Follow this creator to comment.";
  if (message.includes("post_locked")) return "Subscribe to comment on this post.";
  if (message.includes("comment_thread")) return "Reply to the original comment.";
  if (message.includes("comment_length")) return "Comments can be up to 1000 characters.";
  if (message.includes("too_many_goals")) return "Attach up to 6 wishlist items.";
  if (message.includes("goal_page_mismatch")) return "Choose goals from this page.";
  if (message.includes("too_many_categories")) return "A page can have 24 wishlist categories.";
  if (message.includes("category_page_mismatch")) return "Choose a category from this page.";
  if (message.includes("wishlist_categories_page_name")) return "That category is already on this page.";
  if (message.includes("image_page_mismatch") || message.includes("invalid_image_path")) {
    return "That photo could not be saved.";
  }
  if (message.includes("goals_link_https")) return "Goal link must start with https://.";
  return message;
}

import type {
  AccessCode,
  CreatorPage,
  FeedPost,
  Goal,
  ManagedPost,
  PageRole,
} from "@/lib/types";

function record(value: unknown) {
  return value as Record<string, unknown>;
}

export function toPage(value: unknown): CreatorPage {
  const row = record(value);
  return {
    id: String(row.id),
    slug: String(row.slug),
    display_name: String(row.display_name),
    bio: row.bio == null ? null : String(row.bio),
    cover_image: row.cover_image == null ? null : String(row.cover_image),
    paypal_link: row.paypal_link == null ? null : String(row.paypal_link),
    created_at: String(row.created_at),
  };
}

export function toGoal(value: unknown): Goal {
  const row = record(value);
  return {
    id: String(row.id),
    page_id: String(row.page_id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    target_amount: row.target_amount as number | string,
    current_amount_raised: row.current_amount_raised as number | string,
    created_at: String(row.created_at),
  };
}

export function toFeedPost(value: unknown): FeedPost {
  const row = record(value);
  return {
    id: String(row.id),
    page_id: String(row.page_id),
    content: row.content == null ? null : String(row.content),
    image_url: row.image_url == null ? null : String(row.image_url),
    is_paywalled: Boolean(row.is_paywalled),
    is_locked: Boolean(row.is_locked),
    created_at: String(row.created_at),
  };
}

export function toManagedPost(value: unknown): ManagedPost {
  const row = record(value);
  return {
    id: String(row.id),
    page_id: String(row.page_id),
    content: row.content == null ? null : String(row.content),
    image_url: row.image_url == null ? null : String(row.image_url),
    is_paywalled: Boolean(row.is_paywalled),
    created_at: String(row.created_at),
  };
}

export function toAccessCode(value: unknown): AccessCode {
  const row = record(value);
  return {
    id: String(row.id),
    page_id: String(row.page_id),
    code_string: String(row.code_string),
    duration_days: Number(row.duration_days),
    is_redeemed: Boolean(row.is_redeemed),
    redeemed_by_user: row.redeemed_by_user == null ? null : String(row.redeemed_by_user),
    created_at: String(row.created_at),
  };
}

export function toRole(value: unknown): PageRole | null {
  return value === "owner" || value === "manager" ? value : null;
}

import { httpsUrl } from "@/lib/format";
import { pageFont, pagePalette } from "@/lib/page-theme";
import type {
  AccessCode,
  CoverImage,
  CreatorPage,
  FeedPost,
  Goal,
  ManagedPost,
  WishlistCategory,
  PageMember,
  PageRole,
  PostComment,
  PostGoal,
  PostImage,
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
    palette: pagePalette(row.palette),
    font: pageFont(row.font),
    created_at: String(row.created_at),
  };
}

export function toWishlistCategory(value: unknown): WishlistCategory | null {
  const row = record(value);
  const name = String(row.name ?? "").trim();
  if (row.id == null || row.page_id == null || !name) return null;
  return {
    id: String(row.id),
    page_id: String(row.page_id),
    name,
    created_at: String(row.created_at ?? ""),
  };
}

export function toGoal(value: unknown): Goal {
  const row = record(value);
  return {
    id: String(row.id),
    page_id: String(row.page_id),
    category_ids: categoryIds(row.goal_categories),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    link: httpsUrl(row.link == null ? null : String(row.link)),
    image_url: httpsUrl(row.image_url == null ? null : String(row.image_url)),
    image_storage_path: row.image_storage_path == null ? null : String(row.image_storage_path),
    image_width: positiveInt(row.image_width),
    image_height: positiveInt(row.image_height),
    target_amount: row.target_amount as number | string,
    current_amount_raised: row.current_amount_raised as number | string,
    created_at: String(row.created_at),
  };
}

function categoryIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = value.flatMap((item) => {
    const id = record(item).category_id;
    return typeof id === "string" && id ? [id] : [];
  });
  return [...new Set(ids)];
}

function positiveInt(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 4000) return null;
  return n;
}

export function toCoverImage(value: unknown): CoverImage | null {
  const image = toPostImage(value);
  if (!image) return null;
  const row = record(value);
  if (row.id == null) return null;
  return {
    id: String(row.id),
    url: image.url,
    storage_path: row.storage_path == null ? null : String(row.storage_path),
    width: image.width,
    height: image.height,
  };
}

export function toPostImage(value: unknown): PostImage | null {
  if (!value || typeof value !== "object") return null;
  const row = record(value);
  const url = httpsUrl(row.url == null ? null : String(row.url));
  if (!url) return null;
  const width = positiveInt(row.width);
  const height = positiveInt(row.height);
  return {
    url,
    width: width && height ? width : null,
    height: width && height ? height : null,
  };
}

export function toPostGoal(value: unknown): PostGoal | null {
  if (!value || typeof value !== "object") return null;
  const row = record(value);
  if (row.id == null || row.title == null) return null;
  return {
    id: String(row.id),
    title: String(row.title),
    link: httpsUrl(row.link == null ? null : String(row.link)),
    image: toPostImage({
      url: row.image_url,
      width: row.image_width,
      height: row.image_height,
    }),
    target_amount: (row.target_amount ?? 0) as number | string,
    current_amount_raised: (row.current_amount_raised ?? 0) as number | string,
  };
}

function imagesFromRow(row: Record<string, unknown>) {
  const source = Array.isArray(row.images)
    ? row.images
    : Array.isArray(row.post_images)
      ? [...row.post_images].sort((a, b) => Number(record(a).sort_order) - Number(record(b).sort_order))
      : [];
  const images = source.map(toPostImage).filter((image) => image != null);
  if (images.length > 0) return images;
  const legacy = httpsUrl(row.image_url == null ? null : String(row.image_url));
  return legacy ? [{ url: legacy, width: null, height: null }] : [];
}

function goalsFromRow(row: Record<string, unknown>): PostGoal[] {
  if (Array.isArray(row.post_goals)) {
    return [...row.post_goals]
      .sort((a, b) => Number(record(a).sort_order) - Number(record(b).sort_order))
      .flatMap((entry) => {
        const embedded = record(entry).goals;
        const goal = toPostGoal(Array.isArray(embedded) ? embedded[0] : embedded);
        return goal ? [goal] : [];
      });
  }
  if (!Array.isArray(row.goals)) return [];
  return row.goals.flatMap((goal) => {
    const parsed = toPostGoal(goal);
    return parsed ? [parsed] : [];
  });
}

export function toFeedPost(value: unknown): FeedPost {
  const row = record(value);
  const imageUrl = row.image_url == null ? null : String(row.image_url);
  return {
    id: String(row.id),
    page_id: String(row.page_id),
    content: row.content == null ? null : String(row.content),
    image_url: imageUrl,
    images: imagesFromRow(row),
    goals: goalsFromRow(row),
    comments: [],
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
    images: imagesFromRow(row),
    goals: goalsFromRow(row).map((goal) => ({ id: goal.id, title: goal.title })),
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

function authorFrom(row: Record<string, unknown>) {
  const embedded = row.author ?? row.users;
  const user = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!user || typeof user !== "object") return null;
  const profile = record(user);
  if (profile.username == null) return null;
  return {
    id: String(row.user_id ?? ""),
    username: String(profile.username),
    tiktok: httpsUrl(profile.tiktok_url == null ? null : String(profile.tiktok_url)),
    facebook: httpsUrl(profile.facebook_url == null ? null : String(profile.facebook_url)),
    x: httpsUrl(profile.x_url == null ? null : String(profile.x_url)),
    instagram: httpsUrl(profile.instagram_url == null ? null : String(profile.instagram_url)),
  };
}

export function commentThreads(rows: unknown[], postId: string): PostComment[] {
  const flat = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const recordRow = record(row);
    if (String(recordRow.post_id) !== postId) return [];
    const author = authorFrom(recordRow);
    if (!author || recordRow.id == null || recordRow.body == null) return [];
    return [
      {
        id: String(recordRow.id),
        parentId: recordRow.parent_id == null ? null : String(recordRow.parent_id),
        body: String(recordRow.body),
        createdAt: String(recordRow.created_at ?? ""),
        author,
      },
    ];
  });

  return flat
    .filter((comment) => comment.parentId == null)
    .map((comment) => ({
      id: comment.id,
      body: comment.body,
      created_at: comment.createdAt,
      author: comment.author,
      replies: flat
        .filter((reply) => reply.parentId === comment.id)
        .map((reply) => ({
          id: reply.id,
          body: reply.body,
          created_at: reply.createdAt,
          author: reply.author,
        })),
    }));
}

export function toRole(value: unknown): PageRole | null {
  return value === "owner" || value === "manager" ? value : null;
}

export function toPageMember(value: unknown): PageMember | null {
  const row = record(value);
  const role = toRole(row.role);
  const userId = typeof row.user_id === "string" ? row.user_id : "";
  const linked = Array.isArray(row.users) ? row.users[0] : row.users;
  const profile = linked && typeof linked === "object" ? record(linked) : {};
  const username = typeof profile.username === "string" ? profile.username : "";
  if (!role || !userId || !username) return null;
  return { userId, username, role };
}

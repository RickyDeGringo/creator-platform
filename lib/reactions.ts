export const REACTIONS = [
  { id: "heart", glyph: "❤️", label: "Heart" },
  { id: "fire", glyph: "🔥", label: "Fire" },
  { id: "laugh", glyph: "😂", label: "Laugh" },
  { id: "clap", glyph: "👏", label: "Clap" },
  { id: "wow", glyph: "😮", label: "Wow" },
  { id: "sparkle", glyph: "✨", label: "Sparkle" },
] as const;

export type ReactionEmoji = (typeof REACTIONS)[number]["id"];

export type ReactionCount = {
  emoji: ReactionEmoji;
  count: number;
};

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return REACTIONS.some((item) => item.id === value);
}

export function reactionsUnavailable(message: string | undefined) {
  if (!message) return false;
  return /reaction_totals|post_reactions/i.test(message) && /schema cache|does not exist|could not find/i.test(message);
}

export function reactionGlyph(emoji: ReactionEmoji) {
  return REACTIONS.find((item) => item.id === emoji)?.glyph ?? emoji;
}

export function reactionLabel(emoji: ReactionEmoji) {
  return REACTIONS.find((item) => item.id === emoji)?.label ?? emoji;
}

function record(value: unknown) {
  return value as Record<string, unknown>;
}

export function reactionCountsFor(rows: unknown[], postId: string): ReactionCount[] {
  const totals = new Map<ReactionEmoji, number>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const entry = record(row);
    if (String(entry.post_id ?? "") !== postId) continue;
    const emoji = String(entry.emoji ?? "");
    if (!isReactionEmoji(emoji)) continue;
    const count = Number(entry.total ?? entry.count ?? 1);
    if (!Number.isFinite(count) || count <= 0) continue;
    totals.set(emoji, (totals.get(emoji) ?? 0) + count);
  }
  return REACTIONS.flatMap((item) => {
    const count = totals.get(item.id);
    return count ? [{ emoji: item.id, count }] : [];
  });
}

export function viewerReactionsFor(rows: unknown[], postId: string): ReactionEmoji[] {
  const mine = new Set<ReactionEmoji>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const entry = record(row);
    if (String(entry.post_id ?? "") !== postId) continue;
    const emoji = String(entry.emoji ?? "");
    if (isReactionEmoji(emoji)) mine.add(emoji);
  }
  return REACTIONS.flatMap((item) => (mine.has(item.id) ? [item.id] : []));
}

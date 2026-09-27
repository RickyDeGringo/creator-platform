"use client";

import { useActionState } from "react";
import { toggleReaction } from "@/app/actions/reactions";
import { FormMessage } from "@/components/form-message";
import { REACTIONS, reactionLabel, type ReactionCount, type ReactionEmoji } from "@/lib/reactions";
import type { CommentAccess } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostReactions({
  slug,
  postId,
  reactions,
  viewerReactions,
  access,
}: {
  slug: string;
  postId: string;
  reactions: ReactionCount[];
  viewerReactions: ReactionEmoji[];
  access: CommentAccess;
}) {
  const [state, action, pending] = useActionState(toggleReaction.bind(null, slug), null);
  const canReact = access.signedIn && (access.following || access.member);
  const counts = new Map(reactions.map((reaction) => [reaction.emoji, reaction.count]));

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((item) => {
          const count = counts.get(item.id) ?? 0;
          const pressed = viewerReactions.includes(item.id);
          const label = count === 1 ? `1 ${item.label}` : `${count} ${item.label}`;
          if (!canReact) {
            return (
              <span
                key={item.id}
                className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-muted-foreground ring-1 ring-foreground/15"
                title={access.signedIn ? "Follow to react" : "Sign in to react"}
              >
                <span aria-hidden="true">{item.glyph}</span>
                <span className="sr-only">{label}</span>
                {count > 0 ? <span className="tabular-nums">{count}</span> : null}
              </span>
            );
          }
          return (
            <form key={item.id} action={action}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="emoji" value={item.id} />
              <button
                type="submit"
                disabled={pending}
                aria-pressed={pressed}
                aria-label={pressed ? `Remove ${reactionLabel(item.id)}. ${label}` : `React with ${item.label}. ${label}`}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm ring-1 ring-foreground/15 transition-colors",
                  pressed ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span aria-hidden="true">{item.glyph}</span>
                {count > 0 ? <span className="tabular-nums">{count}</span> : null}
              </button>
            </form>
          );
        })}
      </div>
      <FormMessage state={state} />
    </div>
  );
}

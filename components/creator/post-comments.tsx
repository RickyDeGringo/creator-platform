"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createComment, deleteComment } from "@/app/actions/comments";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { CommentAccess, CommentAuthor, PostComment } from "@/lib/types";

export function PostComments({
  slug,
  postId,
  comments,
  access,
}: {
  slug: string;
  postId: string;
  comments: PostComment[];
  access: CommentAccess;
}) {
  const count = comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0);
  const canComment = access.signedIn && (access.following || access.member);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  return (
    <section className="mt-5 border-t border-foreground/10 pt-4">
      <h3 className="text-sm font-medium">{count === 1 ? "1 comment" : `${count} comments`}</h3>
      {comments.length > 0 ? (
        <ul className="mt-3 grid gap-4">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentBody
                slug={slug}
                comment={comment}
                access={access}
              />
              {comment.replies.length > 0 ? (
                <ul className="mt-3 ml-4 grid gap-3 border-l border-foreground/10 pl-3">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentBody slug={slug} comment={reply} access={access} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {canComment ? (
                <div className="mt-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2"
                    onClick={() => setReplyTo((current) => (current === comment.id ? null : comment.id))}
                  >
                    {replyTo === comment.id ? "Cancel reply" : "Reply"}
                  </button>
                  {replyTo === comment.id ? (
                    <CommentForm slug={slug} postId={postId} parentId={comment.id} label="Reply" />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No comments yet.</p>
      )}
      <div className="mt-4">
        {canComment ? (
          <CommentForm slug={slug} postId={postId} parentId={null} label="Comment" />
        ) : access.signedIn ? (
          <p className="text-sm text-muted-foreground">Follow to comment.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={`/login?next=/${slug}`} className="underline underline-offset-2">
              Sign in
            </Link>{" "}
            and follow to comment.
          </p>
        )}
      </div>
    </section>
  );
}

function CommentBody({
  slug,
  comment,
  access,
}: {
  slug: string;
  comment: Pick<PostComment, "id" | "body" | "created_at" | "author">;
  access: CommentAccess;
}) {
  const [state, action, pending] = useActionState(deleteComment.bind(null, slug), null);
  const canRemove = access.viewerId === comment.author.id || access.member;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-medium">@{comment.author.username}</span>
        <SocialLinks author={comment.author} />
        <time className="text-xs text-muted-foreground" dateTime={comment.created_at}>
          {formatDate(comment.created_at)}
        </time>
      </div>
      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap break-words">{comment.body}</p>
      {canRemove ? (
        <form action={action} className="mt-1">
          <input type="hidden" name="commentId" value={comment.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={(event) => {
              if (!window.confirm("Remove this comment?")) event.preventDefault();
            }}
          >
            Remove
          </Button>
          <FormMessage state={state} />
        </form>
      ) : null}
    </div>
  );
}

function SocialLinks({ author }: { author: CommentAuthor }) {
  const links = [
    ["TikTok", author.tiktok],
    ["Facebook", author.facebook],
    ["X", author.x],
    ["Instagram", author.instagram],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (links.length === 0) return null;

  return (
    <span className="flex flex-wrap gap-x-2">
      {links.map(([label, href]) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          {label}
        </a>
      ))}
    </span>
  );
}

function CommentForm({
  slug,
  postId,
  parentId,
  label,
}: {
  slug: string;
  postId: string;
  parentId: string | null;
  label: string;
}) {
  const [state, action, pending] = useActionState(createComment.bind(null, slug), null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-2 grid gap-2">
      <input type="hidden" name="postId" value={postId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <Textarea name="body" required maxLength={1000} placeholder={label === "Reply" ? "Write a reply" : "Join the thread"} className="min-h-20" />
      <FormMessage state={state} />
      <Button type="submit" size="sm" disabled={pending} className="w-fit">
        {pending ? "Posting…" : label}
      </Button>
    </form>
  );
}

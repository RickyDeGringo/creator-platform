"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PHOTO_MAX_COUNT } from "@/lib/photo-frame";
import { preparePhotoFile } from "@/lib/prepare-photo";

type DraftPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export type PhotoFieldHandle = {
  files: File[];
};

type PhotoFieldProps = {
  id: string;
  label: string;
  hint: string;
  max?: number;
  multiple?: boolean;
  revision?: { success?: string } | null;
  onPreparing?: (preparing: boolean) => void;
  fieldRef: RefObject<PhotoFieldHandle | null>;
};

export function PhotoField({
  id,
  label,
  hint,
  max = PHOTO_MAX_COUNT,
  multiple = true,
  revision = null,
  onPreparing,
  fieldRef,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<DraftPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const seenRevision = useRef(revision);

  useEffect(() => {
    fieldRef.current = { files: drafts.map((draft) => draft.file) };
  }, [drafts, fieldRef]);

  if (revision !== seenRevision.current) {
    seenRevision.current = revision;
    if (revision?.success && drafts.length > 0) {
      for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
      setDrafts([]);
    }
  }

  function setBusy(next: boolean) {
    setPreparing(next);
    onPreparing?.(next);
  }

  async function addFiles(incoming: File[]) {
    const room = max - drafts.length;
    if (room <= 0 || preparing) return;
    setBusy(true);
    setNote(null);
    const next: DraftPhoto[] = [];
    let skipped = "";
    for (const file of incoming.slice(0, room)) {
      try {
        const prepared = await preparePhotoFile(file);
        next.push({
          id: crypto.randomUUID(),
          file: prepared,
          previewUrl: URL.createObjectURL(prepared),
        });
      } catch (error) {
        skipped = error instanceof Error ? error.message : "Could not prepare that photo.";
      }
    }
    if (incoming.length > room) skipped = `Only ${max} ${max === 1 ? "photo" : "photos"} can be added.`;
    setBusy(false);
    setNote(skipped || null);
    if (next.length > 0) setDrafts((current) => [...current, ...next].slice(0, max));
  }

  function removeDraft(idToRemove: string) {
    setDrafts((current) => {
      const target = current.find((draft) => draft.id === idToRemove);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((draft) => draft.id !== idToRemove);
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={
          dragging
            ? "rounded-xl bg-muted p-4 ring-2 ring-primary"
            : "rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/10"
        }
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles([...event.dataTransfer.files]);
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={preparing || drafts.length >= max}
            onClick={() => inputRef.current?.click()}
          >
            {preparing ? "Preparing…" : max === 1 ? "Add photo" : "Add photos"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {drafts.length} of {max}. Resized for fast loading, never stretched.
          </p>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={multiple && max > 1}
          className="sr-only"
          onChange={(event) => {
            void addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        {drafts.length > 0 ? (
          <ul className="mt-3 flex gap-2 overflow-x-auto">
            {drafts.map((draft, index) => (
              <li key={draft.id} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.previewUrl}
                  alt={`Selected photo ${index + 1}`}
                  className="h-24 w-auto max-w-40 rounded-lg bg-background object-contain"
                />
                <button
                  type="button"
                  className="absolute right-1 bottom-1 inline-flex min-h-11 items-center rounded-md bg-background/90 px-3 text-sm"
                  onClick={() => removeDraft(draft.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
        )}
        {note ? <p className="mt-2 text-sm text-destructive">{note}</p> : null}
      </div>
    </div>
  );
}

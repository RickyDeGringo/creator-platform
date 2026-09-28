"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  COVER_BANNER_DESKTOP_PX,
  COVER_BANNER_MOBILE_PX,
  COVER_TARGET_HEIGHT,
  COVER_TARGET_WIDTH,
  coverFrame,
  PHOTO_MAX_COUNT,
  type CropRect,
} from "@/lib/photo-frame";
import { preparePhotoFile } from "@/lib/prepare-photo";
import { cn } from "@/lib/utils";
import type { CoverImage } from "@/lib/types";

type DraftPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type CropJob = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

export type CoverPhotosHandle = {
  files: File[];
};

export function CoverPhotosField({
  id,
  covers,
  revision = null,
  onPreparing,
  fieldRef,
}: {
  id: string;
  covers: CoverImage[];
  revision?: { success?: string } | null;
  onPreparing?: (preparing: boolean) => void;
  fieldRef: RefObject<CoverPhotosHandle | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<DraftPhoto[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<CropJob[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const seenRevision = useRef(revision);

  const kept = covers.filter((cover) => !removed.has(cover.id));
  const room = Math.max(0, PHOTO_MAX_COUNT - kept.length - drafts.length);
  const current = queue[queueIndex] ?? null;

  useEffect(() => {
    fieldRef.current = { files: drafts.map((draft) => draft.file) };
  }, [drafts, fieldRef]);

  if (revision !== seenRevision.current) {
    seenRevision.current = revision;
    if (revision?.success && drafts.length > 0) {
      for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
      setDrafts([]);
      setRemoved(new Set());
    }
  }

  function setBusy(next: boolean) {
    setPreparing(next);
    onPreparing?.(next);
  }

  function dropQueue(jobs: CropJob[]) {
    for (const job of jobs) URL.revokeObjectURL(job.previewUrl);
  }

  async function addFiles(incoming: File[]) {
    if (room <= 0 || preparing || queue.length > 0) return;
    setNote(null);
    const jobs: CropJob[] = [];
    let skipped = "";
    for (const file of incoming.slice(0, room)) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        const width = bitmap.width;
        const height = bitmap.height;
        bitmap.close();
        jobs.push({ file, previewUrl: URL.createObjectURL(file), width, height });
      } catch {
        skipped = "Could not read that photo. Use a JPEG, PNG, WebP, or GIF.";
      }
    }
    if (incoming.length > room) skipped = "A cover can show 5 images.";
    if (jobs.length === 0) {
      setNote(skipped || "Could not read that photo.");
      return;
    }
    setQueue(jobs);
    setQueueIndex(0);
    if (skipped) setNote(skipped);
  }

  function cancelQueue() {
    dropQueue(queue.slice(queueIndex));
    setQueue([]);
    setQueueIndex(0);
    setBusy(false);
  }

  async function confirmCrop(crop: CropRect) {
    const job = queue[queueIndex];
    if (!job) return;
    setBusy(true);
    setNote(null);
    try {
      const prepared = await preparePhotoFile(job.file, crop);
      setDrafts((currentDrafts) => [
        ...currentDrafts,
        { id: crypto.randomUUID(), file: prepared, previewUrl: URL.createObjectURL(prepared) },
      ]);
      URL.revokeObjectURL(job.previewUrl);
      const next = queueIndex + 1;
      if (next >= queue.length) {
        setQueue([]);
        setQueueIndex(0);
      } else {
        setQueueIndex(next);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not prepare that photo.");
    } finally {
      setBusy(false);
    }
  }

  function removeDraft(idToRemove: string) {
    setDrafts((currentDrafts) => {
      const target = currentDrafts.find((draft) => draft.id === idToRemove);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return currentDrafts.filter((draft) => draft.id !== idToRemove);
    });
  }

  function toggleRemoved(coverId: string) {
    setRemoved((currentRemoved) => {
      const next = new Set(currentRemoved);
      if (next.has(coverId)) next.delete(coverId);
      else next.add(coverId);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Cover photos</Label>
      <p className="text-sm text-muted-foreground">
        Optimum size {COVER_TARGET_WIDTH} × {COVER_TARGET_HEIGHT} px. The banner is full width, {COVER_BANNER_DESKTOP_PX}px
        tall on desktop and {COVER_BANNER_MOBILE_PX}px on a phone, and the centre of this crop stays in frame.
      </p>
      <div
        className={dragging ? "rounded-xl bg-muted p-4 ring-2 ring-primary" : "rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/10"}
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
        {covers.length > 0 || drafts.length > 0 ? (
          <ul className="grid gap-2">
            {covers.map((cover, index) => {
              const marked = removed.has(cover.id);
              return (
                <li key={cover.id} className={cn("relative", marked && "opacity-45")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover.url}
                    alt={`Cover ${index + 1}`}
                    className="aspect-[4/1] w-full rounded-lg bg-background object-cover"
                  />
                  <CornerButton
                    label={marked ? `Restore cover ${index + 1}` : `Remove cover ${index + 1}`}
                    onClick={() => toggleRemoved(cover.id)}
                  >
                    {marked ? <PlusIcon /> : <XIcon />}
                  </CornerButton>
                </li>
              );
            })}
            {drafts.map((draft, index) => (
              <li key={draft.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.previewUrl} alt={`New cover ${index + 1}`} className="aspect-[4/1] w-full rounded-lg bg-background object-cover" />
                <CornerButton label={`Remove new cover ${index + 1}`} onClick={() => removeDraft(draft.id)}>
                  <XIcon />
                </CornerButton>
              </li>
            ))}
          </ul>
        ) : null}
        <div className={cn("flex flex-wrap items-center gap-3", covers.length > 0 || drafts.length > 0 ? "mt-3" : "")}>
          <Button type="button" variant="outline" disabled={preparing || room <= 0 || queue.length > 0} onClick={() => inputRef.current?.click()}>
            {preparing ? "Preparing…" : "Add photos"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {kept.length + drafts.length} of {PHOTO_MAX_COUNT}.
          </p>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={room > 1}
          className="sr-only"
          onChange={(event) => {
            void addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>
      {[...removed].map((coverId) => (
        <input key={coverId} type="hidden" name="remove_cover" value={coverId} />
      ))}
      {note ? <p className="text-sm text-destructive">{note}</p> : null}
      {current ? (
        <CoverCropDialog
          job={current}
          index={queueIndex}
          total={queue.length}
          busy={preparing}
          onConfirm={(crop) => void confirmCrop(crop)}
          onCancel={cancelQueue}
        />
      ) : null}
    </div>
  );
}

function CoverCropDialog({
  job,
  index,
  total,
  busy,
  onConfirm,
  onCancel,
}: {
  job: CropJob;
  index: number;
  total: number;
  busy: boolean;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0.5);
  const [panY, setPanY] = useState(0.5);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  useEffect(() => {
    setZoom(1);
    setPanX(0.5);
    setPanY(0.5);
  }, [job]);

  const crop = coverFrame(job.width, job.height, zoom, panX, panY);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, panX, panY };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current;
    const frame = frameRef.current;
    if (!start || !frame) return;
    const bounds = frame.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const spanX = Math.max(0, job.width - crop.width);
    const spanY = Math.max(0, job.height - crop.height);
    const nextX = spanX === 0 ? 0.5 : start.panX - ((event.clientX - start.x) / bounds.width) * (crop.width / spanX);
    const nextY = spanY === 0 ? 0.5 : start.panY - ((event.clientY - start.y) / bounds.height) * (crop.height / spanY);
    setPanX(Math.min(1, Math.max(0, nextX)));
    setPanY(Math.min(1, Math.max(0, nextY)));
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-2xl border-0 bg-card p-5 text-foreground shadow-2xl backdrop:bg-black/60"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-heading text-2xl">{total > 1 ? `Crop cover ${index + 1} of ${total}` : "Crop cover"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Close
        </Button>
      </div>
      <div
        ref={frameRef}
        className="relative aspect-[4/1] cursor-grab touch-none overflow-hidden rounded-lg bg-muted active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.previewUrl}
          alt=""
          draggable={false}
          className="absolute max-w-none select-none"
          style={{
            width: `${(job.width / crop.width) * 100}%`,
            height: `${(job.height / crop.height) * 100}%`,
            left: `${-(crop.left / crop.width) * 100}%`,
            top: `${-(crop.top / crop.height) * 100}%`,
          }}
        />
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm font-medium">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="h-11 w-full accent-primary"
        />
      </label>
      <p className="mt-2 text-sm text-muted-foreground">Drag the photo to choose the crop. The frame is {COVER_TARGET_WIDTH} × {COVER_TARGET_HEIGHT} px.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button type="button" variant="secondary" className="h-10 w-full" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" className="h-10 w-full" onClick={() => onConfirm(crop)} disabled={busy}>
          {busy ? "Preparing…" : "Use crop"}
        </Button>
      </div>
    </dialog>
  );
}

function CornerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-foreground/15 hover:bg-background"
    >
      {children}
    </button>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  );
}

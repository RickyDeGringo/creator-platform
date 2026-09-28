"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localDateTimeInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PublishedAtField({
  id,
  iso,
  revision = null,
  unlabeled = false,
  className,
}: {
  id: string;
  iso?: string;
  revision?: { success?: string } | null;
  unlabeled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [offset, setOffset] = useState("");

  useEffect(() => {
    if (revision && !revision.success) return;
    const next = localDateTimeInputValue(iso ?? new Date().toISOString());
    setValue(next);
    const date = new Date(next);
    setOffset(Number.isNaN(date.getTime()) ? "" : String(date.getTimezoneOffset()));
  }, [iso, revision]);

  function onChange(next: string) {
    setValue(next);
    const date = new Date(next);
    setOffset(Number.isNaN(date.getTime()) ? "" : String(date.getTimezoneOffset()));
  }

  const control = (
    <Input
      id={id}
      name="published_at"
      type="datetime-local"
      required
      min="2000-01-01T00:00"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={unlabeled ? "h-full min-h-11 w-full py-0 sm:h-full sm:min-h-11" : "h-11 min-h-11 w-full py-0 sm:h-11 sm:min-h-11"}
    />
  );

  if (unlabeled) {
    return (
      <div className={cn("min-w-0", className)}>
        {control}
        <input type="hidden" name="timezone_offset" value={offset} hidden className="hidden" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>Published</Label>
      {control}
      <input type="hidden" name="timezone_offset" value={offset} hidden className="hidden" />
    </div>
  );
}

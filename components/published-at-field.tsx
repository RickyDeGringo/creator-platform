"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localDateTimeInputValue } from "@/lib/format";

export function PublishedAtField({
  id,
  iso,
  revision = null,
}: {
  id: string;
  iso?: string;
  revision?: { success?: string } | null;
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

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Published</Label>
      <Input
        id={id}
        name="published_at"
        type="datetime-local"
        required
        min="2000-01-01T00:00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
      />
      <input type="hidden" name="timezone_offset" value={offset} />
    </div>
  );
}

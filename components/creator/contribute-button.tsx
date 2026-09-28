"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type FormEvent } from "react";
import { parseUsd, paypalContributeUrl, paypalMeHandle } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ContributeButton({
  paypalLink,
  itemTitle,
  className,
}: {
  paypalLink: string | null;
  itemTitle: string;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ready = paypalMeHandle(paypalLink) != null;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!ready) return null;

  function pay(event: FormEvent) {
    event.preventDefault();
    const value = parseUsd(amount);
    if (value == null) {
      setError("Enter a USD amount.");
      inputRef.current?.focus();
      return;
    }
    const href = paypalContributeUrl(paypalLink, value, itemTitle);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function collapseIfEmpty(event: FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    if (amount.trim() !== "") return;
    setAmount("");
    setError(null);
    setOpen(false);
  }

  return (
    <form onSubmit={pay} onBlur={collapseIfEmpty} className={cn("w-full sm:w-auto", className)}>
      <div
        className={cn(
          "relative flex min-h-11 items-center overflow-hidden rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-[width] duration-300 ease-out motion-reduce:transition-none sm:min-h-8",
          open ? "w-full sm:w-56" : "w-full sm:w-36",
        )}
      >
        <button
          type="button"
          tabIndex={open ? -1 : 0}
          aria-hidden={open || undefined}
          className={cn(
            "absolute inset-0 px-2.5 transition-opacity duration-200 ease-out motion-reduce:transition-none",
            open ? "pointer-events-none opacity-0" : "opacity-100",
          )}
          onClick={() => setOpen(true)}
        >
          Contribute
        </button>
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center transition-opacity duration-200 ease-out motion-reduce:transition-none",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={open ? undefined : true}
        >
          <label className="sr-only" htmlFor={inputId}>
            USD amount for {itemTitle}
          </label>
          <span aria-hidden="true" className="pl-2.5">
            $
          </span>
          <input
            ref={inputRef}
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            tabIndex={open ? 0 : -1}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              setAmount("");
              setError(null);
              setOpen(false);
            }}
            className="min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-primary-foreground/55"
          />
          <button
            type="submit"
            tabIndex={open ? 0 : -1}
            aria-label={`Continue to PayPal for ${itemTitle}`}
            onMouseDown={(event) => event.preventDefault()}
            className="inline-flex size-11 shrink-0 items-center justify-center sm:size-8"
          >
            <ArrowRight />
          </button>
        </div>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

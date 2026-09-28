export function SubscribersToggle({
  id,
  defaultChecked = false,
}: {
  id: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="group flex h-10 min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-background px-3 text-sm font-medium select-none hover:bg-muted has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 sm:min-h-10"
    >
      <input
        id={id}
        type="checkbox"
        name="is_paywalled"
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-current group-has-[:checked]:bg-primary-foreground group-has-[:checked]:text-primary"
      >
        <svg viewBox="0 0 16 16" className="size-3 opacity-0 group-has-[:checked]:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      Subscribers only
    </label>
  );
}

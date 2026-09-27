import type { ActionState } from "@/lib/types";

export function FormMessage({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p role="status" className="text-sm text-emerald-300">
        {state.success}
      </p>
    );
  }
  return null;
}

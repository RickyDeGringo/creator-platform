import { Badge } from "@/components/ui/badge";
import type { PageStaff } from "@/lib/types";

export function ManagerList({ staff }: { staff: PageStaff[] }) {
  return (
    <section className="mt-8" aria-labelledby="page-managers">
      <h2 id="page-managers" className="font-heading text-3xl">
        Managers
      </h2>
      {staff.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No managers yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {staff.map((person) => (
            <li
              key={`${person.role}-${person.username}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
            >
              <span className="text-sm font-medium">@{person.username}</span>
              <Badge variant="secondary">{person.role}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { Link } from "@tanstack/react-router";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, EmptyState } from "@/components/ui";
import { buildContext, deriveActions } from "@/lib/engines";
import { useAppStore, useBusiness } from "@/lib/store";

export function ActionsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  if (!business) return null;
  const actions = deriveActions(buildContext(db, business));
  return (
    <AppPage>
      <PageHeader title="Action Center" subtitle="Problems turned into next steps" />
      {actions.length === 0 ? (
        <EmptyState
          title="Nothing needs attention"
          body="When stock is low, payments slip, or pace falls behind, the action will appear here — generated from live data, never invented."
        />
      ) : (
        <ul className="space-y-2">
          {actions.map((a) => (
            <li key={a.id}>
              <Link to={a.href} className="block rounded-[var(--radius-xl)] border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{a.title}</p>
                  <Badge tone={a.severity === "high" ? "bad" : a.severity === "medium" ? "warn" : "neutral"}>{a.severity}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-3 text-sm font-medium text-primary">{a.cta}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}


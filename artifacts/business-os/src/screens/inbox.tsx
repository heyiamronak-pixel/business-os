import { Link } from "@tanstack/react-router";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Button, EmptyState } from "@/components/ui";
import { fromNow } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

export function InboxScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  if (!business) return null;
  const notes = db.notifications.filter((n) => n.businessId === business.id);
  return (
    <AppPage>
      <PageHeader
        title="Inbox"
        subtitle="Stock, tasks, targets, payments"
        action={
          notes.some((n) => !n.read) ? (
            <Button size="sm" variant="ghost" onClick={() => apply(markAllNotificationsRead(useAppStore.getState().db, business.id))}>
              Mark read
            </Button>
          ) : null
        }
      />
      {notes.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          body="Low stock, overdue work, target risk and unpaid sales will land here. Push, email and WhatsApp can reuse the same events later."
        />
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id}>
              <Link
                to={n.href ?? "/"}
                onClick={() => apply(markNotificationRead(useAppStore.getState().db, n.id))}
                className="block rounded-[var(--radius-xl)] border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.read ? <span className="mt-1 size-2 rounded-full bg-primary" /> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-subtle">{fromNow(n.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}

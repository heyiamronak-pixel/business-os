import * as React from "react";
import { Link } from "@tanstack/react-router";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { advise, buildContext, deriveActions, type AdvisorReply } from "@/lib/engines";
import { useAppStore, useBusiness } from "@/lib/store";

export function ActionsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const [expanded, setExpanded] = React.useState<Record<string, AdvisorReply>>({});
  if (!business) return null;
  const context = buildContext(db, business);
  const actions = deriveActions(context);

  function askAI(id: string, title: string, body: string) {
    setExpanded((current) => ({
      ...current,
      [id]: advise(`Help me resolve this: ${title}. ${body}`, context),
    }));
  }

  return (
    <AppPage>
      <PageHeader title="Action Center" subtitle="Business signals turned into practical next steps" />
      {actions.length === 0 ? (
        <EmptyState
          title="Nothing needs attention"
          body="When stock is low, payments slip, or pace falls behind, a relevant action will appear here from your recorded business data."
        />
      ) : (
        <ul className="space-y-3">
          {actions.map((a) => {
            const reply = expanded[a.id];
            return (
              <li key={a.id}>
                <Card className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{a.title}</p>
                    <Badge tone={a.severity === "high" ? "bad" : a.severity === "medium" ? "warn" : "neutral"}>{a.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={a.href} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">{a.cta}</Link>
                    <Button size="sm" variant="secondary" onClick={() => askAI(a.id, a.title, a.body)}>
                      {reply ? "Refresh AI guidance" : "Ask AI what to do"}
                    </Button>
                  </div>
                  {reply ? (
                    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Business Sutra AI guidance</p>
                      {reply.facts.length ? <InsightBlock title="What the data says" items={reply.facts} /> : null}
                      {reply.calculations.length ? <InsightBlock title="Numbers" items={reply.calculations} /> : null}
                      {reply.recommendations.length ? <InsightBlock title="Suggested next steps" items={reply.recommendations} /> : null}
                      <p className="text-[11px] text-muted-foreground">Guidance is generated from this workspace's recorded data. No external AI service is connected yet.</p>
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AppPage>
  );
}

function InsightBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {items.map((item, index) => <li key={index} className="text-sm leading-relaxed">{item}</li>)}
      </ul>
    </div>
  );
}

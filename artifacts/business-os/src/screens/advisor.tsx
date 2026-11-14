import * as React from "react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { ADVISOR_PROMPTS, advise, buildContext, type AdvisorReply } from "@/lib/engines";
import { useAppStore, useBusiness } from "@/lib/store";

export function AdvisorScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const [question, setQuestion] = React.useState("");
  const [thread, setThread] = React.useState<AdvisorReply[]>([]);

  if (!business) return null;
  const ctx = buildContext(db, business);

  function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    const reply = advise(text, ctx);
    setThread((t) => [...t, reply]);
    setQuestion("");
  }

  return (
    <AppPage>
      <PageHeader title="Advisor" subtitle="Answers from your business context — facts, then math, then advice" />
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        The advisor only sees structured metrics for {business.name}. It does not have raw database access. A hosted model can replace the local engine later without changing this contract.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {ADVISOR_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => ask(p)}
            className="rounded-full border border-border bg-card px-3 py-2 text-left text-xs font-medium"
          >
            {p}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {thread.map((r, i) => (
          <Card key={i} className="space-y-3">
            <p className="text-sm font-semibold">{r.question}</p>
            {r.facts.length ? (
              <Block title="Facts from your data" items={r.facts} />
            ) : null}
            {r.calculations.length ? <Block title="Calculations" items={r.calculations} /> : null}
            {r.recommendations.length ? <Block title="Recommendations" items={r.recommendations} /> : null}
          </Card>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this business"
          className="h-11 flex-1 rounded-[var(--radius-md)] border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring/40"
        />
        <Button type="submit">Ask</Button>
      </form>
    </AppPage>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

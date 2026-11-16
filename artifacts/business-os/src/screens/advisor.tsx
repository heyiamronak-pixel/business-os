import * as React from "react";
import { ArrowUpRight, Bot, MessageCircle, Sparkles, Trash2 } from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState, Stat } from "@/components/ui";
import { ADVISOR_PROMPTS, advise, buildContext, type AdvisorReply } from "@/lib/engines";
import { money } from "@/lib/format";
import { assistantLabel, detectAssistantLanguage, toHinglish, type AssistantLanguage } from "@/lib/assistant-language";
import { useAppStore, useBusiness } from "@/lib/store";

type ThreadItem = { reply: AdvisorReply; language: AssistantLanguage };

export function AdvisorScreen() {
  const business = useBusiness();
  const db = useAppStore((state) => state.db);
  const [question, setQuestion] = React.useState("");
  const [thread, setThread] = React.useState<ThreadItem[]>([]);
  const [showAllPrompts, setShowAllPrompts] = React.useState(false);

  if (!business) return null;
  const ctx = buildContext(db, business);
  const prompts = showAllPrompts ? ADVISOR_PROMPTS : ADVISOR_PROMPTS.slice(0, 6);

  function ask(value: string) {
    const text = value.trim();
    if (!text) return;
    const language = detectAssistantLanguage(text);
    const reply = advise(text, ctx);
    const localise = language === "hinglish" ? toHinglish : (value: string) => value;
    setThread((current) => [...current, {
      language,
      reply: {
        ...reply,
        facts: reply.facts.map(localise),
        calculations: reply.calculations.map(localise),
        recommendations: reply.recommendations.map(localise),
      },
    }]);
    setQuestion("");
  }

  return (
    <AppPage>
      <PageHeader
        title="Business Advisor"
        subtitle="Ask questions about your live workspace records"
        action={thread.length ? (
          <Button size="sm" variant="ghost" onClick={() => setThread([])}>
            <Trash2 className="size-4" /> Clear
          </Button>
        ) : undefined}
      />

      <Card className="mb-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">Your business, explained</p>
              <Badge tone="good">Live workspace context</Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Ask in English or Hinglish about sales, profit, collections, stock, customers, marketing, purchases and daily priorities.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-3"><Stat label="Revenue this month" value={money(ctx.kpis.revenue, business.currency)} /></div>
          <div className="rounded-lg bg-muted/50 p-3"><Stat label="Cash collected" value={money(ctx.kpis.cashIn, business.currency)} /></div>
          <div className="rounded-lg bg-muted/50 p-3"><Stat label="Customer balance" value={money(ctx.kpis.outstanding, business.currency)} /></div>
          <div className="rounded-lg bg-muted/50 p-3"><Stat label="Stock alerts" value={String(ctx.stock.out.length + ctx.stock.low.length)} /></div>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Answers are calculated from this workspace's saved records and show their supporting facts. A hosted generative AI model is not connected yet, so the assistant will say when the data is insufficient instead of inventing an answer.
        </p>
      </Card>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Suggested questions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => ask(prompt)}
              className="rounded-full border border-border bg-card px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
            >
              {prompt}
            </button>
          ))}
        </div>
        {ADVISOR_PROMPTS.length > 6 ? (
          <button
            type="button"
            onClick={() => setShowAllPrompts((value) => !value)}
            className="mt-2 text-xs font-medium text-primary"
          >
            {showAllPrompts ? "Show fewer questions" : "Show more questions"}
          </button>
        ) : null}
      </div>

      {thread.length === 0 ? (
        <EmptyState
          title="Start with a business question"
          body="Try “How much customer payment is pending?”, “Which products need restocking?” or “What should I focus on today?”"
          action={<Button variant="secondary" onClick={() => ask("Give me a business health summary")}> <MessageCircle className="size-4" /> Analyse my business</Button>}
        />
      ) : (
        <div className="space-y-3" aria-live="polite">
          {thread.map(({ reply, language }, index) => (
            <Card key={`${index}-${reply.question}`} className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">You</span>
                <p className="pt-1 text-sm font-semibold">{reply.question}</p>
              </div>
              <div className="border-l-2 border-primary/30 pl-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Bot className="size-4" /> Business Advisor
                </p>
                {reply.facts.length ? <Block title={assistantLabel("What your data says", language)} items={reply.facts} /> : null}
                {reply.calculations.length ? <Block title={assistantLabel("Calculations", language)} items={reply.calculations} /> : null}
                {reply.recommendations.length ? <Block title={assistantLabel("Recommended next steps", language)} items={reply.recommendations} /> : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <form
        className="sticky bottom-2 z-20 mt-4 flex gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask in English or Hinglish…"
          aria-label="Ask Business Advisor"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-ring/10"
        />
        <Button type="submit" disabled={!question.trim()} aria-label="Send question">
          Ask <ArrowUpRight className="size-4" />
        </Button>
      </form>
    </AppPage>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{title}</p>
      <ul className="mt-1 space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

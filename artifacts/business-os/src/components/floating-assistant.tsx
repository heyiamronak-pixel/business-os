import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Bot, HelpCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { advise, buildContext, ADVISOR_PROMPTS } from "@/lib/engines";
import { assistantLabel, detectAssistantLanguage, toHinglish, type AssistantLanguage } from "@/lib/assistant-language";
import { useAppStore, useBusiness } from "@/lib/store";

type AssistantMode = "help" | "business";
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  facts?: string[];
  calculations?: string[];
  recommendations?: string[];
  href?: string;
  cta?: string;
  notice?: string;
  language?: AssistantLanguage;
};

type Position = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; originX: number; originY: number };

const POSITION_KEY = "business-sutra-assistant-position-v1";
const BUTTON_SIZE = 58;
const EDGE_GAP = 12;

const pageGuides: Record<string, { title: string; intro: string; steps: string[]; href: string; cta: string }> = {
  "/": {
    title: "Business overview",
    intro: "Use the overview to review business health. The dashboard summarises sales, collections, stock and tasks from your saved records.",
    steps: ["Use the available date and summary controls to review the reporting period.", "Open the relevant module from any alert or metric.", "Keep records accurate by updating transactions in their original module."],
    href: "/reports",
    cta: "Open reports",
  },
  "/sell": {
    title: "Make a sale",
    intro: "Use the Sell screen for quick checkout. Saving a sale updates stock and the customer payment balance.",
    steps: ["Select a customer or choose a walk-in sale.", "Add products and quantities, then verify the discount and amount received.", "Check the total before confirming and saving the sale."],
    href: "/sales",
    cta: "View sales",
  },
  "/sales": {
    title: "Sales and collections",
    intro: "Manage recorded sales, customer balances and payment status here.",
    steps: ["Search for a customer, sale reference or product.", "Narrow records using the date and payment status filters.", "When collecting a partial payment, record only the amount actually received."],
    href: "/sell",
    cta: "Create a sale",
  },
  "/products": {
    title: "Product catalogue",
    intro: "The Products area stores item details, SKU, selling price, cost and minimum stock.",
    steps: ["Choose Add product and enter the name, SKU, price and unit.", "Set opening stock and minimum stock carefully.", "For products with sales or purchase history, use an inactive or archive option where available instead of deleting the record."],
    href: "/inventory",
    cta: "Open inventory",
  },
  "/inventory": {
    title: "Inventory control",
    intro: "Use Inventory to review stock levels and stock movements.",
    steps: ["Identify products with low or zero stock.", "Record received goods through Purchases so supplier and stock history stay connected.", "Use manual adjustments only after verifying the physical stock count."],
    href: "/purchases",
    cta: "Record a purchase",
  },
  "/suppliers": {
    title: "Supplier directory",
    intro: "Maintain supplier details, contact information and purchase history here.",
    steps: ["Choose Add supplier and save the supplier name and contact details.", "Do not select inactive suppliers for new purchases.", "Review linked purchase records to see the supplier balance."],
    href: "/purchases",
    cta: "Open purchases",
  },
  "/purchases": {
    title: "Purchases and supplier payments",
    intro: "Recording a purchase adds the received quantity to inventory and tracks the supplier payable.",
    steps: ["Select a supplier and add the received quantity and unit cost for each product.", "Enter only the amount paid now in the payment field.", "Record later payments against the same purchase. Do not add the stock manually again."],
    href: "/suppliers",
    cta: "View suppliers",
  },
  "/customers": {
    title: "Customer records",
    intro: "Customer profiles keep purchase history, outstanding balances and follow-up context.",
    steps: ["Add the correct phone number and email when creating a customer.", "Link sales to the customer to keep their history accurate.", "When a customer pays, record the payment against the relevant sale."],
    href: "/sales",
    cta: "View sales",
  },
  "/expenses": {
    title: "Expense tracking",
    intro: "Record business expenses with a category and date so reports remain useful.",
    steps: ["Enter the expense amount, date, category and vendor details.", "Verify the date and amount before saving to avoid duplicate entries.", "Select the same period in Reports to compare the expense impact."],
    href: "/reports",
    cta: "Open reports",
  },
  "/targets": {
    title: "Revenue targets",
    intro: "Set a period and goal in Targets to monitor progress against actual revenue.",
    steps: ["Choose a monthly, quarterly or annual period.", "Set a realistic target amount and the relevant dates.", "Compare progress with the actual figures in Reports and the Dashboard."],
    href: "/reports",
    cta: "Open reports",
  },
  "/tasks": {
    title: "Tasks and follow-ups",
    intro: "Use Tasks to track daily team actions, assignees and due dates.",
    steps: ["Add a task title, priority and due date.", "Select an available assignee and keep the status updated.", "Reschedule or complete overdue tasks instead of leaving them unattended."],
    href: "/actions",
    cta: "Review action centre",
  },
  "/team": {
    title: "Team directory",
    intro: "The Team screen currently maintains employee profiles and role labels.",
    steps: ["Save the employee name, email, phone, department and role.", "Set the status to Active or Inactive.", "Important: this screen does not yet send OTP login invitations. Secure employee sign-in and permissions will be enabled in the authentication and backend stage."],
    href: "/settings",
    cta: "Review settings",
  },
  "/attendance": {
    title: "Attendance",
    intro: "The current Attendance flow is a prototype in local workspace mode.",
    steps: ["Review attendance entries.", "Do not assume attendance is shared across users or tied to a verified employee identity.", "Attendance will be linked to authenticated accounts after secure employee login is enabled."],
    href: "/team",
    cta: "Open team",
  },
  "/marketing": {
    title: "Marketing performance",
    intro: "Marketing records store campaign spend, clicks, impressions, leads, customers and attributed revenue.",
    steps: ["Verify each campaign figure against its source report before entering it.", "Review CPL, conversion and ROAS alongside spend and lead counts.", "Verify tracking before treating missing data as zero performance."],
    href: "/reports",
    cta: "Open reports",
  },
  "/reports": {
    title: "Business reports",
    intro: "Reports summarise recorded business activity for the selected date range.",
    steps: ["Select the reporting period.", "Compare revenue, collections, expenses, inventory and supplier payables.", "Export the current report to CSV for review in a spreadsheet."],
    href: "/actions",
    cta: "View action centre",
  },
  "/actions": {
    title: "Action centre",
    intro: "Action Centre highlights operational alerts and next steps based on business data.",
    steps: ["Review high-priority items first.", "Verify the supporting records for each recommendation in the relevant module.", "After completing an action, update the actual record in its source module."],
    href: "/advisor",
    cta: "Ask business advisor",
  },
  "/advisor": {
    title: "Business advisor",
    intro: "Advisor answers questions about sales, collections, stock, marketing and operations using saved workspace data.",
    steps: ["Ask a specific question, such as how much customer payment is pending.", "Check the supporting facts and calculations.", "When data is missing, update the records in the correct module first."],
    href: "/",
    cta: "Back to overview",
  },
  "/settings": {
    title: "Workspace settings",
    intro: "Manage the business profile, preferences and available configuration options in Settings.",
    steps: ["Verify the business name, industry, country, currency and timezone.", "Preview theme and preferences before saving.", "Never paste authentication provider keys or database passwords into chat or source code."],
    href: "/team",
    cta: "Open team",
  },
  "/more": {
    title: "All modules",
    intro: "Use the More screen to access the remaining Business Sutra modules.",
    steps: ["Open the required area from its module card.", "Use the available search and filter controls in each module.", "Do not assume a workflow is complete if its action button is not available yet."],
    href: "/",
    cta: "Back to overview",
  },
};

function getGuide(question: string, pathname: string) {
  const q = question.toLowerCase().normalize("NFKC");
  if (/(custom filter|filter builder|saved view|advanced filter)/.test(q)) {
    return {
      title: "Custom filters",
      intro: "The universal custom filter builder is still being developed. Some modules have date, status and search filters, but shared AND/OR rules and saved views are not active everywhere yet.",
      steps: ["For now, use the search and filters available in the current module.", "Universal filters will include date, status, owner, branch, amount range, sorting, grouping and saved views.", "You will be able to keep saved filters personal or share them with your team."],
      href: pathname,
      cta: "Stay on this screen",
    };
  }
  if (/(invite|login|sign in|otp|employee account|employee id|team member.*access)/.test(q)) {
    return {
      title: "Employee access",
      intro: "Secure employee login and invitations are not active yet. The current Team module is only a local employee directory.",
      steps: ["For now, you can save an employee name, phone, email and role in the Team module.", "OTP login will require a verified phone or email, invitation acceptance and server-side permissions.", "Employees will only have access to their assigned business, branch and permitted actions."],
      href: "/team",
      cta: "Open team directory",
    };
  }

  const requestedRoutes: Array<[RegExp, string]> = [
    [/(record a sale|create a sale|new sale|checkout|sell screen|bikri|sale kaise)/, "/sell"],
    [/(sales|sale|pending payment|customer payment|collection|payment lena)/, "/sales"],
    [/(product|sku|barcode|catalogue|catalog)/, "/products"],
    [/(inventory|stock|reorder|restock|out of stock)/, "/inventory"],
    [/(supplier|vendor|purchase|maal kharid|purchase order)/, "/purchases"],
    [/(customer|client|follow.?up)/, "/customers"],
    [/(expense|kharcha|cost entry)/, "/expenses"],
    [/(revenue target|target|goal)/, "/targets"],
    [/(task|reminder|to.?do)/, "/tasks"],
    [/(employee|team member|staff|department|team)/, "/team"],
    [/(attendance|check.?in|check.?out)/, "/attendance"],
    [/(marketing|campaign|ads|lead|roas|cpl)/, "/marketing"],
    [/(report|analytics|profit|revenue summary)/, "/reports"],
    [/(action centre|action center|business alert)/, "/actions"],
    [/(workspace setting|business setting|theme|currency)/, "/settings"],
  ];
  const requested = requestedRoutes.find(([pattern]) => pattern.test(q))?.[1];
  const current = Object.keys(pageGuides)
    .filter((path) => pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  const route = requested ?? current ?? "/";
  return pageGuides[route] ?? pageGuides["/"];
}

function clampPosition(position: Position): Position {
  if (typeof window === "undefined") return position;
  return {
    x: Math.min(Math.max(EDGE_GAP, position.x), Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP)),
    y: Math.min(Math.max(EDGE_GAP, position.y), Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP)),
  };
}

function makeId() {
  return `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatReply(reply: ReturnType<typeof advise>, language: AssistantLanguage): Message {
  const localise = language === "hinglish" ? toHinglish : (value: string) => value;
  return {
    id: makeId(),
    role: "assistant",
    language,
    text: localise("This answer is based on your current workspace data."),
    facts: reply.facts.map(localise),
    calculations: reply.calculations.map(localise),
    recommendations: reply.recommendations.map(localise),
  };
}

export function FloatingAssistant() {
  const business = useBusiness();
  const db = useAppStore((state) => state.db);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [ready, setReady] = React.useState(false);
  const [position, setPosition] = React.useState<Position>({ x: 0, y: 0 });
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<AssistantMode>("help");
  const [question, setQuestion] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [busy, setBusy] = React.useState(false);
  const dragRef = React.useRef<DragState | null>(null);
  const movedRef = React.useRef(false);
  const context = React.useMemo(() => business ? buildContext(db, business) : null, [db, business]);

  React.useEffect(() => {
    let saved: Position | null = null;
    try {
      const raw = window.localStorage.getItem(POSITION_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "x" in parsed && "y" in parsed && typeof parsed.x === "number" && typeof parsed.y === "number") {
          saved = { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      saved = null;
    }
    setPosition(clampPosition(saved ?? { x: window.innerWidth - BUTTON_SIZE - 24, y: window.innerHeight - BUTTON_SIZE - 108 }));
    setReady(true);
    const onResize = () => setPosition((current) => clampPosition(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      // Position persistence is optional; the helper remains usable without it.
    }
  }, [position, ready]);

  if (!business || pathname === "/onboarding" || !ready) return null;

  const panelWidth = Math.min(390, window.innerWidth - 24);
  const panelHeight = Math.min(560, window.innerHeight - 24);
  const panelLeft = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, position.x > window.innerWidth / 2 ? position.x - panelWidth + BUTTON_SIZE : position.x));
  const suggestedTop = position.y > window.innerHeight / 2 ? position.y - panelHeight - 12 : position.y + BUTTON_SIZE + 12;
  const panelTop = Math.max(12, Math.min(window.innerHeight - panelHeight - 12, suggestedTop));

  function ask(value = question) {
    const trimmed = value.trim();
    if (!trimmed || !context || busy) return;
    const language = detectAssistantLanguage(trimmed);
    const userMessage: Message = { id: makeId(), role: "user", text: trimmed, language };
    setQuestion("");
    setBusy(true);

    if (mode === "help") {
      const guide = getGuide(trimmed, pathname);
      const localise = language === "hinglish" ? toHinglish : (value: string) => value;
      setMessages((current) => [...current, userMessage, {
        id: makeId(),
        role: "assistant",
        language,
        text: `${localise(guide.title)} — ${localise(guide.intro)}`,
        facts: guide.steps.map(localise),
        href: guide.href,
        cta: language === "hinglish" ? localise(guide.cta) : guide.cta,
        notice: localise("App guide preview. Secure employee invitations, universal filters and advanced AI actions are being built in later product stages."),
      }]);
    } else {
      setMessages((current) => [...current, userMessage, formatReply(advise(trimmed, context), language)]);
    }
    setBusy(false);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!movedRef.current && Math.hypot(dx, dy) < 6) return;
    movedRef.current = true;
    setPosition(clampPosition({ x: drag.originX + dx, y: drag.originY + dy }));
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (movedRef.current) {
      setPosition((current) => {
        const next = clampPosition({
          x: current.x < window.innerWidth / 2 ? EDGE_GAP : window.innerWidth - BUTTON_SIZE - EDGE_GAP,
          y: current.y,
        });
        return next;
      });
    } else {
      setOpen((current) => !current);
    }
    dragRef.current = null;
  }

  function onPointerCancel(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    ask();
  }

  return (
    <>
      {open && (
        <section
          aria-label="Sutra AI assistant"
          className="fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{ left: panelLeft, top: panelTop, width: panelWidth, maxHeight: panelHeight }}
        >
          <header className="flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Sutra AI</p>
              <p className="text-[11px] text-muted-foreground">Your in-app guide</p>
            </div>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
          </header>

          <div className="grid grid-cols-2 gap-1 border-b border-border bg-muted/35 p-2">
            <button type="button" onClick={() => setMode("help")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold ${mode === "help" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}><HelpCircle className="size-3.5" /> App guide</button>
            <button type="button" onClick={() => setMode("business")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold ${mode === "business" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}><MessageCircle className="size-3.5" /> My business</button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="rounded-xl bg-muted/45 p-3">
                <p className="text-sm font-semibold">{mode === "help" ? "What are you trying to do?" : "Ask about your business"}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{mode === "help" ? "Main current screen ke hisaab se steps bataunga. Try: “How do I record a purchase?”" : "Sales, pending payments, stock, customers, purchases ya today's focus ke baare mein pucho."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(mode === "help" ? ["How do I record a sale?", "How do I add a team member?", "Where can I see pending payments?"] : ADVISOR_PROMPTS.slice(0, 3)).map((prompt) => (
                    <button key={prompt} type="button" onClick={() => ask(prompt)} className="rounded-full border border-border bg-card px-3 py-2 text-left text-[11px] font-medium hover:border-primary/40 hover:text-primary">{prompt}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={message.role === "user" ? "ml-8 rounded-xl bg-primary px-3 py-2.5 text-primary-foreground" : "mr-2 rounded-xl border border-border bg-background px-3 py-3"}>
                  <p className="whitespace-pre-wrap text-xs leading-5">{message.text}</p>
                  {message.facts?.length ? <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">{message.facts.map((fact, index) => <li key={index} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{fact}</li>)}</ul> : null}
                  {message.calculations?.length ? <div className="mt-2 rounded-lg bg-muted/60 p-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Calculations</p><ul className="mt-1 space-y-1 text-xs leading-5">{message.calculations.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}
                  {message.recommendations?.length ? <div className="mt-2 rounded-lg bg-primary/5 p-2"><p className="text-[10px] font-bold uppercase tracking-wide text-primary">{assistantLabel("Next steps", message.language ?? "english")}</p><ul className="mt-1 space-y-1 text-xs leading-5">{message.recommendations.map((item, index) => <li key={index}>• {item}</li>)}</ul></div> : null}
                  {message.href ? <button type="button" onClick={() => { setOpen(false); navigate({ to: message.href as never }); }} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">{message.cta ?? "Open module"} <ArrowRight className="size-3.5" /></button> : null}
                  {message.notice ? <p className="mt-2 border-t border-border pt-2 text-[10px] leading-4 text-muted-foreground">{message.notice}</p> : null}
                </article>
              ))
            )}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-border bg-background p-3">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={mode === "help" ? "Ask how to use this screen..." : "Ask about your business..."} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40" />
            <button type="submit" disabled={!question.trim() || busy} aria-label="Send question" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="size-4" /></button>
          </form>
          <footer className="flex items-center justify-between gap-2 px-3 pb-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Bot className="size-3" /> Rules + workspace data</span>
            <button type="button" onClick={() => setMessages([])} className="font-semibold hover:text-foreground">Clear chat</button>
          </footer>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Close Sutra AI assistant" : "Open Sutra AI assistant"}
        title="Drag to move · Tap to ask Sutra AI"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        className="fixed z-[71] grid size-[58px] touch-none select-none place-items-center rounded-full border border-primary-foreground/20 bg-primary text-primary-foreground shadow-[0_10px_35px_hsl(var(--primary)/0.32)] transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 active:cursor-grabbing"
        style={{ left: position.x, top: position.y, cursor: "grab" }}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-card text-primary"><span className="size-1.5 rounded-full bg-primary" /></span>
        <span className="sr-only">Move with drag, open with tap</span>
      </button>
    </>
  );
}

import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Bot, HelpCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { advise, buildContext, ADVISOR_PROMPTS } from "@/lib/engines";
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
};

type Position = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; originX: number; originY: number };

const POSITION_KEY = "business-sutra-assistant-position-v1";
const BUTTON_SIZE = 58;
const EDGE_GAP = 12;

const pageGuides: Record<string, { title: string; intro: string; steps: string[]; href: string; cta: string }> = {
  "/": {
    title: "Business overview",
    intro: "Yahan se apne business ki overall health dekho. Dashboard aapke saved records se sales, collections, stock aur tasks ka snapshot banata hai.",
    steps: ["Date range ya available summary controls se period check karo.", "Kisi alert ya metric par click karke related module kholo.", "Data sahi rakhne ke liye transactions ko original module mein update karo."],
    href: "/reports",
    cta: "Open reports",
  },
  "/sell": {
    title: "Make a sale",
    intro: "Sell screen quick checkout ke liye hai. Sale save hone par stock aur payment balance update hota hai.",
    steps: ["Customer select karo, ya walk-in sale choose karo.", "Products aur quantities add karo; discount aur received amount verify karo.", "Confirm karne se pehle total check karo, phir sale save karo."],
    href: "/sales",
    cta: "View sales",
  },
  "/sales": {
    title: "Sales and collections",
    intro: "Yahan recorded sales, customer balances aur payment status manage hote hain.",
    steps: ["Search se customer, sale reference ya product dhoondo.", "Date aur payment status filters se records narrow karo.", "Part-payment collect karte waqt sirf actually received amount record karo."],
    href: "/sell",
    cta: "Create a sale",
  },
  "/products": {
    title: "Product catalogue",
    intro: "Products mein item details, SKU, selling price, cost aur minimum stock maintain hota hai.",
    steps: ["Add product choose karke name, SKU, price aur unit fill karo.", "Opening stock aur minimum stock carefully set karo.", "Existing sales/purchase history wale product ko delete karne ke bajay inactive/archive workflow use karo, where available."],
    href: "/inventory",
    cta: "Open inventory",
  },
  "/inventory": {
    title: "Inventory control",
    intro: "Inventory screen stock levels aur stock movements review karne ke liye hai.",
    steps: ["Low-stock aur out-of-stock products identify karo.", "Received goods ko Purchases ke through record karo so supplier and stock history linked rahe.", "Manual adjustments tabhi use karo jab physical stock count verify ho."],
    href: "/purchases",
    cta: "Record a purchase",
  },
  "/suppliers": {
    title: "Supplier directory",
    intro: "Supplier details, contact information aur purchase history yahan maintain hoti hai.",
    steps: ["Add supplier par click karke supplier ka naam aur contact details save karo.", "Inactive suppliers ko naye purchases ke liye select mat karo.", "Supplier balance dekhne ke liye linked purchase records review karo."],
    href: "/purchases",
    cta: "Open purchases",
  },
  "/purchases": {
    title: "Purchases and supplier payments",
    intro: "Purchase record karne par received quantity inventory mein add hoti hai aur supplier payable track hota hai.",
    steps: ["Supplier select karo aur har product ki received quantity aur unit cost add karo.", "Jo amount abhi pay hua hai wahi payment field mein enter karo.", "Baad ki payment usi purchase ke against record karo; stock ko dobara manually add mat karo."],
    href: "/suppliers",
    cta: "View suppliers",
  },
  "/customers": {
    title: "Customer records",
    intro: "Customer profiles ke saath purchase history, outstanding balance aur follow-up context maintain hota hai.",
    steps: ["Customer create karte waqt correct phone/email add karo.", "Sales ko customer ke saath link karo so history accurate rahe.", "Customer balance collect hone par related sale mein payment record karo."],
    href: "/sales",
    cta: "View sales",
  },
  "/expenses": {
    title: "Expense tracking",
    intro: "Business expenses ko category aur date ke saath record karo so reports meaningful rahen.",
    steps: ["Expense amount, date, category aur vendor details fill karo.", "Duplicate entry se bachne ke liye save karne se pehle date aur amount verify karo.", "Reports mein same period select karke expense impact compare karo."],
    href: "/reports",
    cta: "Open reports",
  },
  "/targets": {
    title: "Revenue targets",
    intro: "Targets mein period aur goal set karke actual revenue ke against progress monitor hoti hai.",
    steps: ["Monthly, quarterly ya annual period choose karo.", "Achievable target amount aur relevant dates set karo.", "Progress ko Reports aur Dashboard ke actual figures ke saath compare karo."],
    href: "/reports",
    cta: "Open reports",
  },
  "/tasks": {
    title: "Tasks and follow-ups",
    intro: "Tasks ka use team ke daily actions, owners aur due dates track karne ke liye karo.",
    steps: ["Task title, priority aur due date add karo.", "Available assignee select karo aur status update karte raho.", "Overdue tasks ko reschedule ya complete karo; unhe silently ignore mat karo."],
    href: "/actions",
    cta: "Review action centre",
  },
  "/team": {
    title: "Team directory",
    intro: "Team screen abhi team member profiles aur role labels maintain karti hai.",
    steps: ["Employee ka name, email, phone, department aur role save karo.", "Status ko Active ya Inactive rakho.", "Important: abhi yahan se employee ko OTP login invitation send nahi hota. Secure employee sign-in aur permissions auth/backend stage mein enable honge."],
    href: "/settings",
    cta: "Review settings",
  },
  "/attendance": {
    title: "Attendance",
    intro: "Attendance ka current flow prototype/local workspace mode mein hai.",
    steps: ["Attendance entries ko review karo.", "Shared multi-user attendance ya verified employee identity assume mat karo.", "Secure employee login ke baad attendance ko authenticated accounts se link kiya jayega."],
    href: "/team",
    cta: "Open team",
  },
  "/marketing": {
    title: "Marketing performance",
    intro: "Marketing records mein campaign spend, clicks, impressions, leads, customers aur attributed revenue maintain karo.",
    steps: ["Har campaign ke numbers source reports se verify karke enter karo.", "Spend aur lead counts ke saath CPL, conversion aur ROAS review karo.", "Missing data ko zero performance samajhne se pehle tracking verify karo."],
    href: "/reports",
    cta: "Open reports",
  },
  "/reports": {
    title: "Business reports",
    intro: "Reports recorded business activity ko date range ke hisaab se summarize karte hain.",
    steps: ["Reporting period select karo.", "Revenue, collections, expenses, inventory aur supplier payables ko compare karo.", "CSV export se current report ko spreadsheet mein review karo."],
    href: "/actions",
    cta: "View action centre",
  },
  "/actions": {
    title: "Action centre",
    intro: "Action Centre business data se nikle operational alerts aur next steps dikhata hai.",
    steps: ["High-priority items pehle review karo.", "Har recommendation ke supporting records ko related module mein verify karo.", "Action complete hone par source module mein actual record update karo."],
    href: "/advisor",
    cta: "Ask business advisor",
  },
  "/advisor": {
    title: "Business advisor",
    intro: "Advisor saved workspace data se sales, collections, stock, marketing aur operations ke questions answer karta hai.",
    steps: ["Specific question pucho, jaise pending customer payment kitna hai.", "Supporting facts aur calculations check karo.", "Data missing ho to pehle correct module mein records update karo."],
    href: "/",
    cta: "Back to overview",
  },
  "/settings": {
    title: "Workspace settings",
    intro: "Settings mein business profile, preferences aur available configuration options manage hote hain.",
    steps: ["Business name, industry, country, currency aur timezone verify karo.", "Theme/preferences save karne se pehle preview check karo.", "Authentication provider keys ya database passwords chat ya source code mein paste mat karo."],
    href: "/team",
    cta: "Open team",
  },
  "/more": {
    title: "All modules",
    intro: "More screen se remaining Business Sutra modules access kar sakte ho.",
    steps: ["Module cards se required area kholo.", "Har module mein available search/filter controls use karo.", "Agar kisi action ka button abhi available nahi hai, usse complete workflow assume mat karo."],
    href: "/",
    cta: "Back to overview",
  },
};

function getGuide(question: string, pathname: string) {
  const q = question.toLowerCase().normalize("NFKC");
  if (/(custom filter|filter builder|saved view|advanced filter)/.test(q)) {
    return {
      title: "Custom filters",
      intro: "Universal custom filter builder abhi build queue mein hai. Kuch modules mein date, status aur search filters available hain, lekin shared AND/OR rules aur saved views har jagah active nahi hain.",
      steps: ["Abhi ke liye current module ke search aur filters use karo.", "Universal filters mein date, status, owner, branch, amount range, sorting, grouping aur saved views include kiye jayenge.", "Saved filters ko personal ya team-shared rakhne ka option design mein rahega."],
      href: pathname,
      cta: "Stay on this screen",
    };
  }
  if (/(invite|login|sign in|otp|employee account|employee id|team member.*access)/.test(q)) {
    return {
      title: "Employee access",
      intro: "Secure employee login aur invitations abhi active nahi hain. Current Team module sirf local employee directory hai.",
      steps: ["Abhi employee profile ka naam, phone, email aur role Team module mein save kar sakte ho.", "OTP login ke liye verified phone/email, invitation acceptance aur server-side permissions implement honge.", "Employee ko sirf assigned business, branch aur allowed actions ka access milega."],
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

function formatReply(reply: ReturnType<typeof advise>): Message {
  return {
    id: makeId(),
    role: "assistant",
    text: "Yeh tumhare current workspace records par based answer hai.",
    facts: reply.facts,
    calculations: reply.calculations,
    recommendations: reply.recommendations,
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
    const userMessage: Message = { id: makeId(), role: "user", text: trimmed };
    setQuestion("");
    setBusy(true);

    if (mode === "help") {
      const guide = getGuide(trimmed, pathname);
      setMessages((current) => [...current, userMessage, {
        id: makeId(),
        role: "assistant",
        text: `${guide.title} — ${guide.intro}`,
        facts: guide.steps,
        href: guide.href,
        cta: guide.cta,
        notice: "App guide preview. Secure employee invitations, universal filters and advanced AI actions are being built in later product stages.",
      }]);
    } else {
      setMessages((current) => [...current, userMessage, formatReply(advise(trimmed, context))]);
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
                  {message.recommendations?.length ? <div className="mt-2 rounded-lg bg-primary/5 p-2"><p className="text-[10px] font-bold uppercase tracking-wide text-primary">Next steps</p><ul className="mt-1 space-y-1 text-xs leading-5">{message.recommendations.map((item, index) => <li key={index}>• {item}</li>)}</ul></div> : null}
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

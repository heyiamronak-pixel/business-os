import * as React from "react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader, SearchField } from "@/components/app-shell";
import { SavedViewControls } from "@/components/saved-view-controls";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import type { Lead, LeadStage } from "@/lib/domain";
import { formatDate, formatDateTime, money } from "@/lib/format";
import { draftLeadFollowUp, suggestLeadNextStep } from "@/lib/lead-assistant";
import { convertLeadToCustomer, deleteLead, upsertLead } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

const STAGES: { id: LeadStage; label: string; tone: "neutral" | "good" | "warn" | "bad" | "brand" }[] = [
  { id: "new", label: "New", tone: "neutral" },
  { id: "contacted", label: "Contacted", tone: "brand" },
  { id: "qualified", label: "Qualified", tone: "good" },
  { id: "proposal", label: "Proposal", tone: "warn" },
  { id: "won", label: "Won", tone: "good" },
  { id: "lost", label: "Lost", tone: "bad" },
];
type LeadDraft = { name: string; company: string; email: string; phone: string; source: string; stage: LeadStage; value: string; expectedCloseDate: string; followUpAt: string; assignedTo: string; notes: string };
const stageMeta = (stage: LeadStage) => STAGES.find((item) => item.id === stage) ?? STAGES[0];

export function LeadsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<LeadStage | "all">("all");
  const [editing, setEditing] = React.useState<Lead | "new" | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  if (!business) return null;
  const members = db.members.filter((member) => member.businessId === business.id);
  const leads = db.leads.filter((lead) => lead.businessId === business.id);
  const term = query.trim().toLowerCase();
  const filtered = leads.filter((lead) => (filter === "all" || lead.stage === filter) && (!term || [lead.name, lead.company, lead.email, lead.phone, lead.source].some((value) => value?.toLowerCase().includes(term))));
  const active = leads.filter((lead) => !["won", "lost"].includes(lead.stage));
  const pipelineValue = active.reduce((sum, lead) => sum + lead.value, 0);
  const save = (draft: LeadDraft) => {
    try {
      apply(upsertLead(useAppStore.getState().db, {
        id: editing !== "new" && editing ? editing.id : undefined, businessId: business.id,
        name: draft.name, company: draft.company, email: draft.email, phone: draft.phone, source: draft.source,
        stage: draft.stage, value: Number(draft.value), expectedCloseDate: draft.expectedCloseDate,
        followUpAt: draft.followUpAt, assignedTo: draft.assignedTo, notes: draft.notes,
      }));
      toast.success("Lead saved");
      setEditing(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save lead"); }
  };
  const exportCsv = () => {
    const rows = [["Name", "Company", "Email", "Phone", "Source", "Stage", "Value", "Expected close", "Follow-up"], ...filtered.map((lead) => [lead.name, lead.company ?? "", lead.email ?? "", lead.phone ?? "", lead.source ?? "", lead.stage, String(lead.value), lead.expectedCloseDate ?? "", lead.followUpAt ?? ""])];
    const csv = rows.map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "business-sutra-leads.csv"; anchor.click(); URL.revokeObjectURL(url);
  };
  return (
    <AppPage>
      <PageHeader title="Leads" subtitle="Track prospects from first enquiry to customer conversion." action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button><Button size="sm" onClick={() => setEditing("new")}>Add lead</Button></div>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Total leads</p><p className="mt-1 text-2xl font-semibold tabular-nums">{leads.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Active pipeline</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(pipelineValue, business.currency)}</p></div>
        <div className="col-span-2 rounded-xl border border-border bg-card p-3 sm:col-span-1"><p className="text-xs text-muted-foreground">Won</p><p className="mt-1 text-2xl font-semibold tabular-nums">{leads.filter((lead) => lead.stage === "won").length}</p></div>
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_190px]"><SearchField value={query} onChange={setQuery} placeholder="Search name, company, phone or email" /><Select value={filter} onChange={(event) => setFilter(event.target.value as LeadStage | "all")}><option value="all">All stages</option>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</Select></div>
      <SavedViewControls businessId={business.id} moduleKey="leads" filters={{ query, filter }} onApply={(saved) => {
        setQuery(saved.query ?? "");
        setFilter((saved.filter as LeadStage | "all") ?? "all");
      }} />
      {leads.length === 0 ? <EmptyState title="No leads yet" body="Add your first prospect and move it through the pipeline as conversations progress." action={<Button onClick={() => setEditing("new")}>Add first lead</Button>} /> : filtered.length === 0 ? <EmptyState title="No matching leads" body="Try another search term or pipeline stage." /> : (
        <ul className="space-y-2">{filtered.map((lead) => {
          const stage = stageMeta(lead.stage);
          const assignee = members.find((member) => member.id === lead.assignedTo);
          return <li key={lead.id} className="rounded-xl border border-border bg-card p-3">
            <button type="button" className="w-full text-left" onClick={() => setEditing(lead)}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{lead.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.company || lead.source || "No company added"}</p></div><Badge tone={stage.tone}>{stage.label}</Badge></div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">{money(lead.value, business.currency)}</span>{lead.phone ? <span>{lead.phone}</span> : null}{assignee ? <span>{assignee.name}</span> : null}{lead.followUpAt ? <span>Follow-up {formatDateTime(lead.followUpAt)}</span> : null}{lead.expectedCloseDate ? <span>Close {formatDate(lead.expectedCloseDate)}</span> : null}</div>
            </button>
            {lead.stage === "won" && !lead.convertedCustomerId ? <div className="mt-2 border-t border-border pt-2"><Button size="sm" variant="secondary" onClick={() => { try { const result = convertLeadToCustomer(useAppStore.getState().db, lead.id); apply(result.db); toast.success("Lead converted to customer"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not convert lead"); } }}>Convert to customer</Button></div> : null}
          </li>;
        })}</ul>
      )}
      {editing ? <LeadForm lead={editing === "new" ? undefined : editing} members={members} onClose={() => setEditing(null)} onSave={save} onDelete={editing === "new" ? undefined : () => setConfirm(editing.id)} /> : null}
      <BottomSheet open={!!confirm} onOpenChange={() => setConfirm(null)} title="Delete lead?" footer={<ConfirmBar danger confirmLabel="Delete" onCancel={() => setConfirm(null)} onConfirm={() => { if (!confirm) return; apply(deleteLead(useAppStore.getState().db, confirm)); toast.success("Lead deleted"); setConfirm(null); setEditing(null); }} />}><p className="text-sm text-muted-foreground">This removes the lead from the pipeline. Converted customer records are not deleted.</p></BottomSheet>
    </AppPage>
  );
}

function LeadForm({ lead, members, onClose, onSave, onDelete }: { lead?: Lead; members: { id: string; name: string }[]; onClose: () => void; onSave: (draft: LeadDraft) => void; onDelete?: () => void }) {
  const [aiSuggestion, setAiSuggestion] = React.useState<{ title: string; reason: string } | null>(null);
  const [messageDraft, setMessageDraft] = React.useState("");
  const [draft, setDraft] = React.useState<LeadDraft>({
    name: lead?.name ?? "", company: lead?.company ?? "", email: lead?.email ?? "", phone: lead?.phone ?? "",
    source: lead?.source ?? "Website", stage: lead?.stage ?? "new", value: String(lead?.value ?? 0),
    expectedCloseDate: lead?.expectedCloseDate ?? "", followUpAt: lead?.followUpAt ?? "", assignedTo: lead?.assignedTo ?? "", notes: lead?.notes ?? "",
  });
  const update = <K extends keyof LeadDraft>(key: K, value: LeadDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <BottomSheet open onOpenChange={(open) => !open && onClose()} title={lead ? "Edit lead" : "New lead"} footer={<div className="space-y-2"><Button className="w-full" onClick={() => onSave(draft)} disabled={!draft.name.trim()}>Save lead</Button>{onDelete ? <Button variant="ghost" className="w-full text-danger" onClick={onDelete}>Delete lead</Button> : null}</div>}>
    <div className="space-y-3">
      <Field label="Lead name"><Input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Contact person" /></Field>
      <Field label="Company / property"><Input value={draft.company} onChange={(event) => update("company", event.target.value)} placeholder="Business name" /></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Phone"><Input value={draft.phone} onChange={(event) => update("phone", event.target.value)} /></Field><Field label="Email"><Input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} /></Field></div>
      <div className="grid grid-cols-2 gap-2"><Field label="Source"><Select value={draft.source} onChange={(event) => update("source", event.target.value)}><option>Website</option><option>Google Ads</option><option>Referral</option><option>Social media</option><option>Walk-in</option><option>Other</option></Select></Field><Field label="Stage"><Select value={draft.stage} onChange={(event) => update("stage", event.target.value as LeadStage)}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</Select></Field></div>
      <div className="grid grid-cols-2 gap-2"><Field label="Potential value"><Input type="number" min="0" step="0.01" value={draft.value} onChange={(event) => update("value", event.target.value)} /></Field><Field label="Assigned to"><Select value={draft.assignedTo} onChange={(event) => update("assignedTo", event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</Select></Field></div>
      <div className="grid grid-cols-2 gap-2"><Field label="Expected close"><Input type="date" value={draft.expectedCloseDate} onChange={(event) => update("expectedCloseDate", event.target.value)} /></Field><Field label="Next follow-up"><Input type="datetime-local" value={draft.followUpAt} onChange={(event) => update("followUpAt", event.target.value)} /></Field></div>
      <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-3">
        <div><p className="text-xs font-semibold">Sutra AI · Quick assist</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Stage-based guidance and message drafts using this lead’s saved details. External AI is not connected in this preview.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAiSuggestion(suggestLeadNextStep(draft.stage))}>Suggest next action</Button>
          <Button size="sm" variant="outline" onClick={() => setMessageDraft(draftLeadFollowUp(draft))} disabled={!draft.name.trim()}>Draft follow-up</Button>
        </div>
        {aiSuggestion ? <div className="rounded-lg bg-card p-3"><p className="text-xs font-semibold">{aiSuggestion.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{aiSuggestion.reason}</p></div> : null}
        {messageDraft ? <div className="space-y-2"><Textarea value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} /><Button size="sm" variant="secondary" onClick={() => { if (!navigator.clipboard) { toast.error("Clipboard access is unavailable in this browser."); return; } void navigator.clipboard.writeText(messageDraft).then(() => toast.success("Follow-up draft copied")).catch(() => toast.error("Could not copy the draft")); }}>Copy draft</Button></div> : null}
      </section>
      <Field label="Notes"><Textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Context, requirements or next steps" /></Field>
      {lead?.convertedCustomerId ? <p className="text-xs text-muted-foreground">Converted to a customer record.</p> : null}
    </div>
  </BottomSheet>;
}
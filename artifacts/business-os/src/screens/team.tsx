import * as React from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { AppPage, ConfirmBar, PageHeader } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Select } from "@/components/ui";
import { canRole, getSubscriptionMemberLimit, type Role, type TeamMember } from "@/lib/domain";
import { deleteMember, upsertMember } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

export function TeamScreen() {
  const business = useBusiness();
  const navigate = useNavigate();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [editing, setEditing] = React.useState<Partial<TeamMember> | "new" | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<Role>("employee");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  if (!business) return null;
  const members = db.members.filter((m) => m.businessId === business.id);
  const memberLimit = getSubscriptionMemberLimit(business.subscriptionPlan);
  const atMemberLimit = members.length >= memberLimit;

  function open(m?: TeamMember) {
    if (m) {
      setEditing(m);
      setName(m.name);
      setRole(m.role);
      setEmail(m.email ?? "");
      setPhone(m.phone ?? "");
    } else {
      setEditing("new");
      setName("");
      setRole("employee");
      setEmail("");
      setPhone("");
    }
  }

  function save() {
    if (!business) return;
    try {
      apply(
        upsertMember(useAppStore.getState().db, {
          id: editing === "new" || !editing ? undefined : editing.id,
          businessId: business.id,
          name,
          role,
          email,
          phone,
        }),
      );
      toast.success("Team member saved");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Team"
        subtitle="Roles control who can see revenue, costs and settings"
        action={<Button size="sm" onClick={() => { if (atMemberLimit) { toast.error("Upgrade your plan to add more team members."); navigate({ to: "/settings" }); return; } open(); }}>Add member</Button>}
      />
      <p className="mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {members.length} / {memberLimit} seats used · includes the owner/admin. {atMemberLimit ? "Upgrade your plan to add more people." : "Your plan's seat limit is enforced when adding team members."}
      </p>
      {members.length === 0 ? (
        <EmptyState title="No team members" body="The owner is created during setup. Add people to assign tasks." />
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id}>
              <button type="button" className="flex w-full items-center justify-between rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left" onClick={() => open(m)}>
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email || m.phone || "No contact"}</p>
                </div>
                <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{m.role}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Permission map is ready for cloud auth: owners see everything; employees are limited to sales, inventory, customers and tasks. Access is scoped per business.
      </p>
      <BottomSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "New member" : "Edit member"}
        footer={
          <div className="space-y-2">
            <Button className="w-full" onClick={save}>
              Save
            </Button>
            {editing && editing !== "new" && editing.id ? (
              <Button variant="ghost" className="w-full text-danger" onClick={() => setConfirm(editing.id!)}>
                Remove
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </Select>
          </Field>
          <p className="text-xs text-muted-foreground">
            This role can access: {roleAccess(role)}
          </p>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
      </BottomSheet>
      <BottomSheet
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title="Remove team member?"
        footer={
          <ConfirmBar
            danger
            confirmLabel="Remove"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              try {
                apply(deleteMember(useAppStore.getState().db, confirm!));
                toast.success("Removed");
                setConfirm(null);
                setEditing(null);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not remove");
              }
            }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">Assigned tasks become unassigned.</p>
      </BottomSheet>
    </AppPage>
  );
}

function roleAccess(role: Role): string {
  const keys = ["revenue", "expenses", "profit", "sales", "inventory", "customers", "tasks", "reports", "team", "settings", "marketing"] as const;
  return keys.filter((k) => canRole(role, k)).join(", ");
}

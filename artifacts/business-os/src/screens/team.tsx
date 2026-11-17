import * as React from "react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Select } from "@/components/ui";
import { canRole, type Role, type TeamMember } from "@/lib/domain";
import { deleteMember, upsertMember } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

export function TeamScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [editing, setEditing] = React.useState<Partial<TeamMember> | "new" | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<Role>("employee");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [branchIds, setBranchIds] = React.useState<string[]>([]);

  if (!business) return null;
  const members = db.members.filter((m) => m.businessId === business.id);
  const branches = db.branches.filter((item) => item.businessId === business.id && item.isActive);

  function open(m?: TeamMember) {
    if (m) {
      setEditing(m);
      setName(m.name);
      setRole(m.role);
      setEmail(m.email ?? "");
      setPhone(m.phone ?? "");
      setBranchIds(m.branchIds ?? branches.slice(0, 1).map((item) => item.id));
    } else {
      setEditing("new");
      setName("");
      setRole("employee");
      setEmail("");
      setPhone("");
      setBranchIds(branches.slice(0, 1).map((item) => item.id));
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
          branchIds,
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
        action={<Button size="sm" onClick={() => open()}>Add</Button>}
      />
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
                  <p className="mt-1 text-[11px] text-muted-foreground">{(m.branchIds ?? []).map((id) => branches.find((item) => item.id === id)?.name).filter(Boolean).join(", ") || "No branch assigned"}</p>
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
          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-xs font-semibold">Branch access</p>
            {branches.length ? branches.map((item) => (
              <label key={item.id} className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={branchIds.includes(item.id)} onChange={(event) => setBranchIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                <span>{item.name}</span><span className="ml-auto text-[10px] text-muted-foreground">{item.code}</span>
              </label>
            )) : <p className="text-xs text-muted-foreground">Create a branch in Settings before assigning branch access.</p>}
            <p className="text-[10px] leading-4 text-muted-foreground">Branch assignment is saved locally. Secure sign-in and server-enforced branch permissions will be enabled in the authentication stage.</p>
          </div>
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

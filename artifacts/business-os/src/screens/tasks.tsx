import * as React from "react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import type { TaskItem, TaskPriority, TaskStatus } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { deleteTask, setTaskStatus, upsertTask } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";
import { startOfDay } from "@/lib/utils";

type Filter = "open" | "today" | "overdue" | "done";

export function TasksScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [filter, setFilter] = React.useState<Filter>("open");
  const [editing, setEditing] = React.useState<Partial<TaskItem> | "new" | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);

  if (!business) return null;
  const members = db.members.filter((m) => m.businessId === business.id);
  const today = startOfDay(new Date()).toISOString().slice(0, 10);
  const tasks = db.tasks.filter((t) => t.businessId === business.id);
  const list = tasks.filter((t) => {
    if (filter === "done") return t.status === "done";
    if (filter === "today") return t.status !== "done" && t.dueDate?.slice(0, 10) === today;
    if (filter === "overdue") return t.status !== "done" && !!t.dueDate && t.dueDate.slice(0, 10) < today;
    return t.status !== "done";
  });

  const form = editing === "new" || !editing ? null : editing;

  return (
    <AppPage>
      <PageHeader
        title="Tasks"
        subtitle="What the team needs to finish"
        action={<Button size="sm" onClick={() => setEditing("new")}>Add</Button>}
      />
      <div className="mb-3">
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
          options={[
            { id: "open", label: "Open" },
            { id: "today", label: "Today" },
            { id: "overdue", label: "Overdue" },
            { id: "done", label: "Done" },
          ]}
        />
      </div>
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          body="Create a task with an owner and a due date. Overdue work shows up in the Action Center."
          action={<Button onClick={() => setEditing("new")}>Add task</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState title="Nothing in this view" body="Switch filters or add a task." />
      ) : (
        <ul className="space-y-2">
          {list.map((t) => {
            const assignee = members.find((m) => m.id === t.assignedTo);
            const overdue = t.status !== "done" && t.dueDate && t.dueDate.slice(0, 10) < today;
            return (
              <li key={t.id} className="rounded-[var(--radius-xl)] border border-border bg-card p-3">
                <button type="button" className="w-full text-left" onClick={() => setEditing(t)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{t.title}</p>
                    <Badge tone={t.priority === "high" ? "bad" : t.priority === "medium" ? "warn" : "neutral"}>{t.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {assignee?.name ?? "Unassigned"}
                    {t.dueDate ? ` · ${formatDate(t.dueDate, "d MMM")}` : ""}
                    {overdue ? " · overdue" : ""}
                  </p>
                </button>
                {t.status !== "done" ? (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => apply(setTaskStatus(useAppStore.getState().db, t.id, t.status === "todo" ? "doing" : "done"))}>
                      {t.status === "todo" ? "Start" : "Complete"}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {editing ? (
        <TaskForm
          task={form ?? { title: "", priority: "medium", status: "todo" }}
          members={members}
          onClose={() => setEditing(null)}
          onDelete={form?.id ? () => setConfirm(form.id!) : undefined}
          onSave={(input) => {
            try {
              apply(
                upsertTask(useAppStore.getState().db, {
                  ...input,
                  id: form?.id,
                  businessId: business.id,
                }),
              );
              toast.success("Task saved");
              setEditing(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save");
            }
          }}
        />
      ) : null}
      <BottomSheet
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title="Delete task?"
        footer={
          <ConfirmBar
            danger
            confirmLabel="Delete"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              apply(deleteTask(useAppStore.getState().db, confirm!));
              toast.success("Task removed");
              setConfirm(null);
              setEditing(null);
            }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">This removes it from the Action Center too.</p>
      </BottomSheet>
    </AppPage>
  );
}

function TaskForm({
  task,
  members,
  onClose,
  onSave,
  onDelete,
}: {
  task: Partial<TaskItem>;
  members: { id: string; name: string }[];
  onClose: () => void;
  onSave: (i: {
    title: string;
    description?: string;
    assignedTo?: string;
    priority: TaskPriority;
    dueDate?: string;
    reminder?: string;
    status: TaskStatus;
  }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = React.useState(task.title ?? "");
  const [description, setDescription] = React.useState(task.description ?? "");
  const [assignedTo, setAssignedTo] = React.useState(task.assignedTo ?? "");
  const [priority, setPriority] = React.useState<TaskPriority>(task.priority ?? "medium");
  const [dueDate, setDueDate] = React.useState(task.dueDate?.slice(0, 10) ?? "");
  const [reminder, setReminder] = React.useState(task.reminder ?? "");
  const [status, setStatus] = React.useState<TaskStatus>(task.status ?? "todo");
  return (
    <BottomSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={task.id ? "Edit task" : "New task"}
      footer={
        <div className="space-y-2">
          <Button className="w-full" onClick={() => onSave({ title, description, assignedTo: assignedTo || undefined, priority, dueDate: dueDate || undefined, reminder: reminder || undefined, status })}>
            Save task
          </Button>
          {onDelete ? (
            <Button variant="ghost" className="w-full text-danger" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Assignee">
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              <option value="todo">To do</option>
              <option value="doing">Doing</option>
              <option value="done">Done</option>
            </Select>
          </Field>
        </div>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Reminder">
          <Input type="datetime-local" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        </Field>
      </div>
    </BottomSheet>
  );
}

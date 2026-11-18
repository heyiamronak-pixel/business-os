import * as React from "react";
import { BookmarkPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Select } from "@/components/ui";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { createId } from "@/lib/utils";

type SavedView = { id: string; name: string; filters: Record<string, string>; createdAt: string };

function storageKey(businessId: string, moduleKey: string) {
  return "business-sutra-saved-views-v1:" + businessId + ":" + moduleKey;
}

function readViews(key: string): SavedView[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is SavedView =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.name === "string" &&
      !!item.filters && typeof item.filters === "object" &&
      Object.values(item.filters).every((entry) => typeof entry === "string")
    ).slice(0, 30);
  } catch {
    return [];
  }
}

export function SavedViewControls({
  businessId,
  moduleKey,
  filters,
  onApply,
}: {
  businessId: string;
  moduleKey: string;
  filters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}) {
  const key = storageKey(businessId, moduleKey);
  const [views, setViews] = React.useState<SavedView[]>([]);
  const [selectedId, setSelectedId] = React.useState("");

  React.useEffect(() => {
    setViews(readViews(key));
    setSelectedId("");
  }, [key]);

  function persist(next: SavedView[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setViews(next);
      return true;
    } catch {
      toast.error("Could not save this view in browser storage.");
      return false;
    }
  }

  function saveView() {
    const name = window.prompt("Name this saved view");
    if (!name?.trim()) return;
    const view: SavedView = {
      id: createId("view"),
      name: name.trim().slice(0, 40),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };
    if (persist([...views, view].slice(-30))) {
      setSelectedId(view.id);
      toast.success("Saved view created");
    }
  }

  function applyView(id: string) {
    setSelectedId(id);
    const view = views.find((item) => item.id === id);
    if (view) onApply({ ...view.filters });
  }

  function deleteView() {
    const view = views.find((item) => item.id === selectedId);
    if (!view || !window.confirm('Delete saved view "' + view.name + '"?')) return;
    if (persist(views.filter((item) => item.id !== selectedId))) {
      setSelectedId("");
      toast.success("Saved view deleted");
    }
  }

  return (
    <PlanFeatureGate feature="savedViews" compact title="Saved views are included in Growth" description="Upgrade to Growth to save and reuse custom filters in this module.">
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/25 p-2">
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saved views</span>
      <div className="min-w-40 flex-1">
        <Select value={selectedId} onChange={(event) => applyView(event.target.value)} className="w-full">
          <option value="">Current filters</option>
          {views.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
        </Select>
      </div>
      <Button size="sm" variant="secondary" onClick={saveView}><BookmarkPlus className="size-4" />Save</Button>
      {selectedId ? <Button size="sm" variant="ghost" className="text-danger" onClick={deleteView} aria-label="Delete selected saved view"><Trash2 className="size-4" /></Button> : null}
    </div>
    </PlanFeatureGate>
  );
}

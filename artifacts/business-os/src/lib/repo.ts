import { emptyDb, type WorkspaceDB } from "@/lib/domain";

export const STORAGE_KEY = "vestra.os.v1";

export interface PersistedState {
  db: WorkspaceDB;
  currentBusinessId: string | null;
}

export interface Repository {
  load(): PersistedState;
  save(state: PersistedState): void;
  clear(): void;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function migrate(raw: unknown): PersistedState {
  if (!isObject(raw)) return { db: emptyDb(), currentBusinessId: null };
  const saved = isObject(raw.db) ? raw.db : {};
  const db = {
    ...emptyDb(),
    ...saved,
    suppliers: Array.isArray(saved.suppliers) ? saved.suppliers : [],
    purchases: Array.isArray(saved.purchases) ? saved.purchases : [],
    invoices: Array.isArray(saved.invoices) ? saved.invoices : [],
    leads: Array.isArray(saved.leads) ? saved.leads : [],
    leads: Array.isArray(saved.leads) ? saved.leads : [],
    businesses: Array.isArray(saved.businesses) ? saved.businesses.map((entry) => {
      const business = isObject(entry) ? entry : {};
      const enabled = Array.isArray(business.enabledModules) ? business.enabledModules as string[] : [];
      const order = Array.isArray(business.moduleOrder) ? business.moduleOrder as string[] : [];
      return {
        ...business,
        enabledModules: Array.from(new Set([...enabled, "invoices"])),
        moduleOrder: Array.from(new Set([...order, "invoices"])),
      };
    }) as WorkspaceDB["businesses"] : [],
    version: 1,
  } as WorkspaceDB;
  const currentBusinessId =
    typeof raw.currentBusinessId === "string" ? raw.currentBusinessId : null;
  return { db, currentBusinessId };
}

export const localRepository: Repository = {
  load() {
    if (typeof window === "undefined") return { db: emptyDb(), currentBusinessId: null };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { db: emptyDb(), currentBusinessId: null };
      return migrate(JSON.parse(raw));
    } catch {
      return { db: emptyDb(), currentBusinessId: null };
    }
  },
  save(state) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded — keep working in memory.
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

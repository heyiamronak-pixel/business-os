import type { WorkspaceDB } from "@/lib/domain";

type CloudSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: { id: string; email?: string };
};
type CloudSnapshotRow = {
  business_id: string;
  business_name: string;
  schema_version: number;
  snapshot: Partial<WorkspaceDB>;
  updated_at: string;
};

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SESSION_KEY = "business-sutra.auth.v1";

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function readSession(): CloudSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as CloudSession;
    return session.access_token && session.refresh_token ? session : null;
  } catch {
    return null;
  }
}

function writeSession(session: CloudSession | null) {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(SESSION_KEY);
  else window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function normaliseSession(session: CloudSession): CloudSession {
  const expiresAt = session.expires_at ?? (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined);
  return { ...session, ...(expiresAt ? { expires_at: expiresAt } : {}) };
}

async function authFetch(path: string, init: RequestInit = {}) {
  if (!isCloudConfigured) throw new Error("Cloud sync is not configured. Add the Supabase project URL and anon key in Netlify.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body && typeof body === "object" && "msg" in body
      ? String(body.msg)
      : body && typeof body === "object" && "message" in body
        ? String(body.message)
        : "Authentication request failed.";
    throw new Error(message);
  }
  return body;
}

export async function signInWithPassword(email: string, password: string): Promise<CloudSession> {
  const result = await authFetch("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  }) as CloudSession;
  if (!result.access_token || !result.refresh_token) throw new Error("Supabase did not return a valid session.");
  const session = normaliseSession(result);
  writeSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string): Promise<CloudSession | null> {
  const result = await authFetch("signup", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  }) as CloudSession;
  if (!result.access_token || !result.refresh_token) return null;
  const session = normaliseSession(result);
  writeSession(session);
  return session;
}

export async function getValidSession(): Promise<CloudSession | null> {
  const session = readSession();
  if (!session) return null;
  const expiry = session.expires_at ?? 0;
  if (expiry > Math.floor(Date.now() / 1000) + 60) return session;
  try {
    const refreshed = await authFetch("token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }) as CloudSession;
    if (!refreshed.access_token || !refreshed.refresh_token) throw new Error("Refresh response was incomplete.");
    const next = normaliseSession(refreshed);
    writeSession(next);
    return next;
  } catch {
    writeSession(null);
    return null;
  }
}

export async function getCloudUser(session: CloudSession) {
  if (!isCloudConfigured) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY!, authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) return null;
  return await response.json() as { id: string; email?: string };
}

export async function signOutCloud() {
  const session = readSession();
  if (session && isCloudConfigured) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY!, authorization: `Bearer ${session.access_token}` },
    }).catch(() => undefined);
  }
  writeSession(null);
}

function snapshotForBusiness(db: WorkspaceDB, businessId: string): Partial<WorkspaceDB> {
  const byBusiness = <T extends { businessId: string }>(items: T[]) => items.filter((item) => item.businessId === businessId);
  return {
    version: 1,
    businesses: db.businesses.filter((item) => item.id === businessId),
    products: byBusiness(db.products),
    movements: byBusiness(db.movements),
    customers: byBusiness(db.customers),
    suppliers: byBusiness(db.suppliers),
    purchases: byBusiness(db.purchases),
    sales: byBusiness(db.sales),
    expenses: byBusiness(db.expenses),
    expenseCategories: byBusiness(db.expenseCategories),
    targets: byBusiness(db.targets),
    members: byBusiness(db.members),
    tasks: byBusiness(db.tasks),
    campaigns: byBusiness(db.campaigns),
    activity: byBusiness(db.activity),
    notifications: byBusiness(db.notifications),
    invoices: byBusiness(db.invoices),
  };
}

export async function fetchCloudSnapshots(session: CloudSession): Promise<CloudSnapshotRow[]> {
  const response = await fetch("/api/workspace", {
    headers: { authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
    throw new Error(error.error?.message ?? error.message ?? "Could not load cloud workspace data.");
  }
  return await response.json() as CloudSnapshotRow[];
}

export async function saveCloudSnapshot(session: CloudSession, db: WorkspaceDB, businessId: string) {
  const business = db.businesses.find((item) => item.id === businessId);
  if (!business) return;
  const response = await fetch("/api/workspace", {
    method: "PUT",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      businessId,
      businessName: business.name,
      snapshot: snapshotForBusiness(db, businessId),
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
    throw new Error(error.error?.message ?? error.message ?? "Could not save workspace data to the cloud.");
  }
}

export function mergeCloudSnapshots(local: WorkspaceDB, rows: CloudSnapshotRow[]): WorkspaceDB {
  let merged = { ...local };
  const collections = [
    "products", "movements", "customers", "suppliers", "purchases", "sales",
    "expenses", "expenseCategories", "targets", "members", "tasks", "campaigns",
    "activity", "notifications", "invoices",
  ] as const;

  for (const row of rows) {
    const snapshot = row.snapshot;
    const businessId = row.business_id;
    merged.businesses = [
      ...new Map([
        ...merged.businesses.map((business) => [business.id, business] as const),
        ...(snapshot.businesses ?? []).map((business) => [business.id, business] as const),
      ]).values(),
    ];
    for (const key of collections) {
      const localItems = merged[key] as Array<{ id: string; businessId: string }>;
      const cloudItems = (snapshot[key] ?? []) as Array<{ id: string; businessId: string }>;
      (merged as Record<string, unknown>)[key] = [
        ...localItems.filter((item) => item.businessId !== businessId),
        ...cloudItems,
      ];
    }
  }
  return merged;
}

export async function syncAllBusinesses(session: CloudSession, db: WorkspaceDB) {
  for (const business of db.businesses) {
    await saveCloudSnapshot(session, db, business.id);
  }
}

export type { CloudSession };

type EnvReader = { get?: (key: string) => string | undefined };
const runtime = globalThis as typeof globalThis & { Netlify?: { env?: EnvReader } };
const env = (key: string) => runtime.Netlify?.env?.get?.(key) ?? process.env[key];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function config() {
  const url = env("SUPABASE_URL")?.replace(/\/$/, "");
  const key = env("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to Netlify Functions environment variables.");
  return { url, key };
}

async function authenticatedUser(url: string, key: string, token: string) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string; email?: string };
  return user.id ? user : null;
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "GET" && request.method !== "PUT") {
    return json({ error: { code: "method_not_allowed", message: "Use GET or PUT." } }, 405);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: { code: "authentication_required", message: "Sign in to sync your workspace." } }, 401);

  let settings: ReturnType<typeof config>;
  try { settings = config(); }
  catch (error) { return json({ error: { code: "not_configured", message: error instanceof Error ? error.message : "Supabase is not configured." } }, 503); }

  const user = await authenticatedUser(settings.url, settings.key, match[1]);
  if (!user) return json({ error: { code: "invalid_session", message: "Your session has expired. Sign in again." } }, 401);

  const restHeaders = {
    apikey: settings.key,
    authorization: `Bearer ${match[1]}`,
    "content-type": "application/json",
    accept: "application/json",
  };

  if (request.method === "GET") {
    const response = await fetch(`${settings.url}/rest/v1/workspace_snapshots?select=business_id,business_name,schema_version,snapshot,updated_at&order=updated_at.desc`, {
      headers: restHeaders,
      signal: AbortSignal.timeout(12000),
    });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return json({ error: { code: "invalid_json", message: "Send valid JSON." } }, 400); }

  if (!input || typeof input !== "object") return json({ error: { code: "invalid_payload", message: "Workspace payload is required." } }, 400);
  const payload = input as Record<string, unknown>;
  const businessId = typeof payload.businessId === "string" ? payload.businessId.trim() : "";
  const businessName = typeof payload.businessName === "string" ? payload.businessName.trim() : "";
  const snapshot = payload.snapshot;
  if (!businessId || businessId.length > 120 || !businessName || businessName.length > 160 || !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return json({ error: { code: "invalid_payload", message: "A valid business ID, name and workspace snapshot are required." } }, 400);
  }
  const serialized = JSON.stringify(snapshot);
  if (serialized.length > 2_000_000) return json({ error: { code: "payload_too_large", message: "This workspace is too large to sync in one request." } }, 413);

  const response = await fetch(`${settings.url}/rest/v1/workspace_snapshots?on_conflict=business_id,user_id`, {
    method: "POST",
    headers: { ...restHeaders, prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      business_id: businessId,
      user_id: user.id,
      business_name: businessName,
      schema_version: 1,
      snapshot,
      updated_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  return new Response(body, { status: response.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
};

export const config = { path: "/api/workspace" };

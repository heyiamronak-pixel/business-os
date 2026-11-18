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

export default async (request: Request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "Use GET or POST." } }, 405);
  }
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: { code: "authentication_required", message: "Sign in to use customer support." } }, 401);

  let settings: ReturnType<typeof config>;
  try { settings = config(); }
  catch (error) { return json({ error: { code: "not_configured", message: error instanceof Error ? error.message : "Supabase is not configured." } }, 503); }

  const authResponse = await fetch(`${settings.url}/auth/v1/user`, {
    headers: { apikey: settings.key, authorization: `Bearer ${match[1]}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!authResponse.ok) return json({ error: { code: "invalid_session", message: "Your session has expired. Sign in again." } }, 401);
  const user = await authResponse.json() as { id?: string };
  if (!user.id) return json({ error: { code: "invalid_session", message: "Could not verify your account." } }, 401);

  const headers = {
    apikey: settings.key,
    authorization: `Bearer ${match[1]}`,
    "content-type": "application/json",
    accept: "application/json",
  };

  if (request.method === "GET") {
    const response = await fetch(`${settings.url}/rest/v1/support_tickets?select=id,business_id,subject,category,priority,status,description,created_at,updated_at,support_messages(id,sender_user_id,message,is_staff,created_at)&order=updated_at.desc`, {
      headers,
      signal: AbortSignal.timeout(12000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return json({ error: { code: "invalid_json", message: "Send valid JSON." } }, 400); }
  if (!input || typeof input !== "object") return json({ error: { code: "invalid_payload", message: "A support request is required." } }, 400);
  const body = input as Record<string, unknown>;

  if (body.action === "reply") {
    const ticketId = typeof body.ticketId === "string" ? body.ticketId : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!ticketId || message.length < 1 || message.length > 10000) {
      return json({ error: { code: "invalid_reply", message: "Enter a message of up to 10,000 characters." } }, 400);
    }
    const response = await fetch(`${settings.url}/rest/v1/support_messages`, {
      method: "POST",
      headers: { ...headers, prefer: "return=representation" },
      body: JSON.stringify({ ticket_id: ticketId, sender_user_id: user.id, message, is_staff: false }),
      signal: AbortSignal.timeout(12000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 60) : "general";
  const businessId = typeof body.businessId === "string" ? body.businessId.trim() : null;
  const priority = body.priority === "low" || body.priority === "high" || body.priority === "urgent" ? body.priority : "normal";
  if (subject.length < 4 || subject.length > 160 || description.length < 10 || description.length > 10000) {
    return json({ error: { code: "invalid_ticket", message: "Subject must be 4–160 characters and description 10–10,000 characters." } }, 400);
  }

  const response = await fetch(`${settings.url}/rest/v1/support_tickets`, {
    method: "POST",
    headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify({ user_id: user.id, business_id: businessId, subject, description, category, priority }),
    signal: AbortSignal.timeout(12000),
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
};

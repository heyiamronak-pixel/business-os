import assert from "node:assert/strict";
import test from "node:test";
import { requireSupabaseAuth } from "../../artifacts/api-server/src/middlewares/supabase-auth";

const USER_ID = "7c0f4b3e-3f2c-4eac-9b8d-86e6a1d0b123";

function harness(authorization?: string) {
  let statusCode = 200;
  let body: unknown;
  let continued = false;
  const req = {
    get: (name: string) => name.toLowerCase() === "authorization" ? authorization : undefined,
  } as Parameters<typeof requireSupabaseAuth>[0];
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as Parameters<typeof requireSupabaseAuth>[1];
  const next = () => { continued = true; };
  return {
    req, res, next,
    get statusCode() { return statusCode; },
    get body() { return body; },
    get continued() { return continued; },
  };
}

test("Supabase auth middleware rejects missing bearer tokens", async () => {
  const state = harness();
  await requireSupabaseAuth(state.req, state.res, state.next);
  assert.equal(state.statusCode, 401);
  assert.equal(state.continued, false);
});

test("Supabase auth middleware trusts identity only after Auth API verification", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_ANON_KEY;
  const previousFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://project.supabase.co/";
  process.env.SUPABASE_ANON_KEY = "public-test-key";
  let requestedUrl = "";
  let requestedToken = "";
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestedToken = new Headers(init?.headers).get("authorization") ?? "";
    return new Response(JSON.stringify({
      id: USER_ID,
      email: "ronak@example.test",
      user_metadata: { full_name: "Test User" },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  try {
    const state = harness("Bearer verified-test-token");
    await requireSupabaseAuth(state.req, state.res, state.next);
    assert.equal(requestedUrl, "https://project.supabase.co/auth/v1/user");
    assert.equal(requestedToken, "Bearer verified-test-token");
    assert.equal(state.continued, true);
    assert.equal(state.req.authUser?.id, USER_ID);
    assert.equal(state.req.authUser?.email, "ronak@example.test");
    assert.equal(state.req.authUser?.fullName, "Test User");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previousKey;
  }
});

test("Supabase auth middleware rejects incomplete provider identities", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_ANON_KEY;
  const previousFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "public-test-key";
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ id: "not-a-uuid", email: "test@example.test" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  try {
    const state = harness("Bearer invalid-identity-token");
    await requireSupabaseAuth(state.req, state.res, state.next);
    assert.equal(state.statusCode, 401);
    assert.equal(state.continued, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previousKey;
  }
});

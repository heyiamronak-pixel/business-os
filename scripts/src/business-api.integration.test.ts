import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

const USER_A = "7c0f4b3e-3f2c-4eac-9b8d-86e6a1d0b123";
const USER_B = "8c0f4b3e-3f2c-4eac-9b8d-86e6a1d0b124";
const ANON_KEY = "ci-supabase-anon-key";

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Test server did not bind to a TCP port."));
        return;
      }
      resolve(address.port);
    });
  });
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("HTTP API isolates businesses using the restricted PostgreSQL runtime role", async () => {
  assert.ok(process.env.DATABASE_URL, "CI must provide a restricted API DATABASE_URL");

  const users: Record<string, { id: string; email: string; user_metadata: { full_name: string } }> = {
    "user-a-token": { id: USER_A, email: "a@example.test", user_metadata: { full_name: "User A" } },
    "user-b-token": { id: USER_B, email: "b@example.test", user_metadata: { full_name: "User B" } },
  };

  const authServer = createServer((req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    if (req.url !== "/auth/v1/user" || req.headers.apikey !== ANON_KEY || !users[token]) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "Invalid token" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(users[token]));
  });

  let apiServer: Server | undefined;
  const authPort = await listen(authServer);
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = `http://127.0.0.1:${authPort}`;
  process.env.SUPABASE_ANON_KEY = ANON_KEY;

  try {
    const { default: app } = await import("../../artifacts/api-server/src/app");
    apiServer = app.listen(0, "127.0.0.1");
    const apiPort = await new Promise<number>((resolve, reject) => {
      apiServer?.once("error", reject);
      apiServer?.once("listening", () => {
        const address = apiServer?.address();
        if (!address || typeof address === "string") {
          reject(new Error("API test server did not bind to a TCP port."));
          return;
        }
        resolve(address.port);
      });
    });
    const apiUrl = `http://127.0.0.1:${apiPort}`;

    async function call(token: string, path: string, init: RequestInit = {}) {
      return fetch(`${apiUrl}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${token}`,
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
      });
    }

    const createA = await call("user-a-token", "/api/v1/businesses", {
      method: "POST",
      body: JSON.stringify({ name: "User A Business", industry: "retail" }),
    });
    assert.equal(createA.status, 200);
    const aPayload = await createA.json() as { business: { id: string }; role: string };
    assert.ok(aPayload.business.id);
    assert.equal(aPayload.role, "owner");

    const createB = await call("user-b-token", "/api/v1/businesses", {
      method: "POST",
      body: JSON.stringify({ name: "User B Business", industry: "services" }),
    });
    assert.equal(createB.status, 200);
    const bPayload = await createB.json() as { business: { id: string }; role: string };
    assert.ok(bPayload.business.id);

    const branchA = await call("user-a-token", `/api/v1/businesses/${aPayload.business.id}/branches`, {
      method: "POST",
      body: JSON.stringify({ code: "HQ", name: "A Head Office" }),
    });
    assert.equal(branchA.status, 200);

    const ownBusinesses = await call("user-a-token", "/api/v1/businesses");
    const ownPayload = await ownBusinesses.json() as { businesses: Array<{ id: string }> };
    assert.deepEqual(ownPayload.businesses.map((business) => business.id), [aPayload.business.id]);

    const hiddenBranches = await call(
      "user-a-token",
      `/api/v1/businesses/${bPayload.business.id}/branches`,
    );
    assert.equal(hiddenBranches.status, 200);
    const hiddenPayload = await hiddenBranches.json() as { branches: unknown[] };
    assert.deepEqual(hiddenPayload.branches, []);

    const forbiddenWrite = await call(
      "user-a-token",
      `/api/v1/businesses/${bPayload.business.id}/branches`,
      { method: "POST", body: JSON.stringify({ code: "EVIL", name: "Cross tenant" }) },
    );
    assert.equal(forbiddenWrite.status, 403);

    const userBBusinesses = await call("user-b-token", "/api/v1/businesses");
    const userBPayload = await userBBusinesses.json() as { businesses: Array<{ id: string }> };
    assert.deepEqual(userBPayload.businesses.map((business) => business.id), [bPayload.business.id]);
  } finally {
    if (apiServer) await close(apiServer);
    await close(authServer);
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previousKey;
  }
});

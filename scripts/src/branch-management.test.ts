import test from "node:test";
import assert from "node:assert/strict";
import { emptyDb, type Business } from "../../artifacts/business-os/src/lib/domain.ts";
import { deleteBranch, upsertBranch, upsertMember } from "../../artifacts/business-os/src/lib/services.ts";

function fixture(plan: "starter" | "growth" = "starter") {
  const db = emptyDb();
  const business: Business = {
    id: "biz-1", name: "Test Business", industry: "retail", businessType: "Sole proprietor",
    country: "India", currency: "INR", timezone: "Asia/Kolkata", brandColors: [],
    themePreset: "professional", appearance: "light", enabledModules: [], moduleOrder: [],
    subscriptionPlan: plan, subscriptionStatus: "trial",
    createdAt: "2026-11-17T00:00:00.000Z", updatedAt: "2026-11-17T00:00:00.000Z",
  };
  return { ...db, businesses: [business] };
}

test("branch creation respects Starter plan limit and rejects duplicate codes", () => {
  let db = fixture("starter");
  const first = upsertBranch(db, { businessId: "biz-1", name: "Main Branch", code: "MAIN" });
  db = first.db;
  assert.equal(db.branches.length, 1);
  assert.throws(() => upsertBranch(db, { businessId: "biz-1", name: "Jaipur Branch", code: "JAI" }), /includes up to 1 branch/);
  assert.throws(() => upsertBranch(db, { businessId: "biz-1", name: "Second Main", code: "MAIN" }), /already exists/);
});

test("Growth plan supports branch create and scoped edits", () => {
  let db = fixture("growth");
  const first = upsertBranch(db, { businessId: "biz-1", name: "Main Branch", code: "MAIN" });
  db = first.db;
  const second = upsertBranch(db, { businessId: "biz-1", name: "Jaipur Branch", code: "JAI", address: "Jaipur" });
  db = second.db;
  const updated = upsertBranch(db, { id: second.branch.id, businessId: "biz-1", name: "Jaipur City", code: "JPR" });
  assert.equal(updated.db.branches.length, 2);
  assert.equal(updated.branch.address, undefined);
  assert.equal(updated.branch.code, "JPR");
  assert.throws(() => upsertBranch(db, { id: second.branch.id, businessId: "another-business", name: "Jaipur City" }), /not found/);
});

test("team member branch assignments are validated and prevent deleting assigned branches", () => {
  let db = fixture("growth");
  const main = upsertBranch(db, { businessId: "biz-1", name: "Main Branch", code: "MAIN" });
  db = main.db;
  const second = upsertBranch(db, { businessId: "biz-1", name: "Jaipur Branch", code: "JAI" });
  db = second.db;
  db = upsertMember(db, { businessId: "biz-1", name: "Aman", role: "employee", branchIds: [second.branch.id] });
  assert.throws(() => deleteBranch(db, second.branch.id), /assigned to team members/);
  assert.throws(() => upsertMember(db, { businessId: "biz-1", name: "Neha", role: "employee", branchIds: ["foreign-branch"] }), /active branches from this business/);
  const member = db.members.find((item) => item.name === "Aman");
  assert.ok(member);
  db = upsertMember(db, { id: member.id, businessId: "biz-1", name: "Aman", role: "employee", branchIds: [] });
  db = deleteBranch(db, second.branch.id);
  assert.equal(db.branches.some((item) => item.id === second.branch.id), false);
  assert.throws(() => deleteBranch(db, main.branch.id), /default branch cannot be deleted/);
});

import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  pool,
  requireActiveMembership,
  withTenantDbContext,
} from "../../lib/db/src/index.ts";
import {
  branch,
  member,
  organization,
  user,
} from "../../lib/db/src/schema/index.ts";

const suffix = randomUUID();
const userA = `p2-user-a-${suffix}`;
const userB = `p2-user-b-${suffix}`;
const orgA = `p2-org-a-${suffix}`;
const orgB = `p2-org-b-${suffix}`;

before(async () => {
  await db.insert(user).values([
    { id: userA, name: "Tenant A owner", email: `owner-a-${suffix}@example.test` },
    { id: userB, name: "Tenant B owner", email: `owner-b-${suffix}@example.test` },
  ]);
  await db.insert(organization).values([
    { id: orgA, name: "Tenant A", slug: `tenant-a-${suffix}` },
    { id: orgB, name: "Tenant B", slug: `tenant-b-${suffix}` },
  ]);
  await db.insert(member).values([
    { id: `membership-a-${suffix}`, userId: userA, organizationId: orgA, role: "owner" },
    { id: `membership-b-${suffix}`, userId: userB, organizationId: orgB, role: "owner" },
  ]);
});

after(async () => {
  await db.delete(organization).where(inArray(organization.id, [orgA, orgB]));
  await db.delete(user).where(inArray(user.id, [userA, userB]));
  await pool.end();
});

test("a member can read only branches in their active organization", async () => {
  await withTenantDbContext(userA, orgA, async (tx) => {
    await tx.insert(branch).values({
      organizationId: orgA,
      name: "Tenant A HQ",
      code: "A-HQ",
    });
    const ownRows = await tx.select().from(branch).where(eq(branch.organizationId, orgA));
    assert.equal(ownRows.length, 1);
    assert.equal(ownRows[0].name, "Tenant A HQ");
  });

  await withTenantDbContext(userB, orgB, async (tx) => {
    const otherTenantRows = await tx.select().from(branch);
    assert.equal(otherTenantRows.length, 0);
  });
});

test("row-level security rejects writes into another organization", async () => {
  await assert.rejects(
    withTenantDbContext(userA, orgA, async (tx) => {
      await tx.insert(branch).values({
        organizationId: orgB,
        name: "Cross-tenant attempt",
        code: "B-ILLEGAL",
      });
    }),
  );
});

test("a user cannot open a tenant context without an active membership", async () => {
  await assert.rejects(
    requireActiveMembership(userA, orgB),
    /do not have active access/,
  );
});

test("a suspended membership is denied", async () => {
  const suspendedMemberId = `membership-suspended-${suffix}`;
  await db.insert(member).values({
    id: suspendedMemberId,
    userId: userA,
    organizationId: orgB,
    role: "employee",
    status: "suspended",
  });

  try {
    await assert.rejects(
      requireActiveMembership(userA, orgB),
      /do not have active access/,
    );
  } finally {
    await db.delete(member).where(
      and(eq(member.id, suspendedMemberId), eq(member.organizationId, orgB)),
    );
  }
});

import { and, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { auditLog, member } from "./schema";

export type TenantContext = {
  /** User ID must come from a verified server-side authentication session. */
  userId: string;
  /** Organization ID must be selected from an authenticated user's memberships. */
  organizationId: string;
  role: string;
};

export type TenantAuditEvent = {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  branchId?: string | null;
  requestId?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Resolves a tenant membership against the database.
 * Never pass a user ID taken directly from the request body or query string.
 */
export async function requireActiveMembership(
  userId: string,
  organizationId: string,
): Promise<TenantContext> {
  if (!userId.trim() || !organizationId.trim()) {
    throw new Error("A verified user and organization are required.");
  }

  const [membership] = await db
    .select({
      role: member.role,
      status: member.status,
    })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  if (!membership || membership.status !== "active") {
    throw new Error("You do not have active access to this workspace.");
  }

  return { userId, organizationId, role: membership.role };
}

type TenantTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs all tenant-owned SQL in one transaction with transaction-local RLS context.
 * The membership check happens before the context is set. RLS variables cannot be
 * carried over to the next pooled connection/transaction.
 */
export async function withTenantDbContext<T>(
  userId: string,
  organizationId: string,
  work: (tx: TenantTransaction, context: TenantContext) => Promise<T>,
): Promise<T> {
  const context = await requireActiveMembership(userId, organizationId);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select
      set_config('app.current_organization_id', ${context.organizationId}, true),
      set_config('app.current_user_id', ${context.userId}, true)
    `);
    return work(tx, context);
  });
}

/**
 * Append an immutable-in-practice audit event through the tenant-scoped transaction.
 * There is deliberately no general update/delete helper for audit events.
 */
export async function appendTenantAuditEvent(
  userId: string,
  organizationId: string,
  event: TenantAuditEvent,
): Promise<void> {
  await withTenantDbContext(userId, organizationId, async (tx, context) => {
    await tx.insert(auditLog).values({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      branchId: event.branchId ?? null,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? null,
      requestId: event.requestId ?? null,
      details: event.details ?? {},
    });
  });
}

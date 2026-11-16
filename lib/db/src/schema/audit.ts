import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUsers } from "./identity";
import { businesses } from "./businesses";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    metadata: jsonb("metadata").notNull().default({}),
    requestId: text("request_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_business_time_idx").on(table.businessId, table.occurredAt),
    index("audit_logs_entity_idx").on(table.businessId, table.entityType, table.entityId),
    index("audit_logs_actor_time_idx").on(table.actorUserId, table.occurredAt),
  ],
);

export type AuditLogRecord = typeof auditLogs.$inferSelect;
export type NewAuditLogRecord = typeof auditLogs.$inferInsert;

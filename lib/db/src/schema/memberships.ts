import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { appUsers } from "./identity";
import { businesses } from "./businesses";

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "manager", "employee"]);
export const membershipStatusEnum = pgEnum("membership_status", ["invited", "active", "suspended"]);

export const businessMemberships = pgTable(
  "business_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("invited"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("business_memberships_business_user_uq").on(table.businessId, table.userId),
    index("business_memberships_user_status_idx").on(table.userId, table.status),
    index("business_memberships_business_status_idx").on(table.businessId, table.status),
  ],
);

export type BusinessMembership = typeof businessMemberships.$inferSelect;
export type NewBusinessMembership = typeof businessMemberships.$inferInsert;

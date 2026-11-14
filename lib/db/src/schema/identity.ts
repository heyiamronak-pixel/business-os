import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "manager",
  "employee",
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "invited",
  "active",
  "suspended",
]);

/**
 * Application identity is linked to a verified identity from an external
 * authentication provider. Passwords and provider tokens are never stored here.
 */
export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authProvider: text("auth_provider").notNull(),
    authSubject: text("auth_subject").notNull(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("app_users_provider_subject_uq").on(table.authProvider, table.authSubject),
    index("app_users_email_idx").on(table.email),
  ],
);

export const businessMemberships = pgTable(
  "business_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").notNull(),
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

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey().references(() => appUsers.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  marketingEmails: boolean("marketing_emails").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type NewAppUser = typeof appUsers.$inferInsert;
export type BusinessMembership = typeof businessMemberships.$inferSelect;
export type NewBusinessMembership = typeof businessMemberships.$inferInsert;

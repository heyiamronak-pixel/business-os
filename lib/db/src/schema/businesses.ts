import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { appUsers } from "./identity";

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    industry: text("industry").notNull().default("other"),
    countryCode: text("country_code").notNull().default("IN"),
    currencyCode: text("currency_code").notNull().default("INR"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    address: text("address"),
    gstRegistered: boolean("gst_registered").notNull().default(false),
    gstin: text("gstin"),
    legalBusinessName: text("legal_business_name"),
    createdBy: uuid("created_by").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("businesses_slug_uq").on(table.slug),
    index("businesses_created_by_idx").on(table.createdBy),
  ],
);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    timezone: text("timezone"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    geofenceRadiusMeters: numeric("geofence_radius_meters", { precision: 8, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("branches_business_code_uq").on(table.businessId, table.code),
    index("branches_business_active_idx").on(table.businessId, table.isActive),
  ],
);

export type BusinessRecord = typeof businesses.$inferSelect;
export type NewBusinessRecord = typeof businesses.$inferInsert;
export type BranchRecord = typeof branches.$inferSelect;
export type NewBranchRecord = typeof branches.$inferInsert;

CREATE TABLE "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email");
--> statement-breakpoint
CREATE TABLE "organization" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "logo" text,
  "metadata" jsonb,
  "industry" text DEFAULT 'other' NOT NULL,
  "country" text DEFAULT 'IN' NOT NULL,
  "currency" text DEFAULT 'INR' NOT NULL,
  "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
  "phone" text,
  "email" text,
  "website" text,
  "address" text,
  "gst_registered" boolean DEFAULT false NOT NULL,
  "gstin" text,
  "legal_business_name" text,
  "brand_color" text DEFAULT '#1f2937' NOT NULL,
  "theme_id" text DEFAULT 'professional' NOT NULL,
  "theme_mode" text DEFAULT 'auto' NOT NULL,
  "enabled_modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_unique" ON "organization" ("slug");
--> statement-breakpoint
CREATE INDEX "organization_created_at_idx" ON "organization" ("created_at");
--> statement-breakpoint
CREATE TABLE "member" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE,
  CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_unique" ON "member" ("organization_id", "user_id");
--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" ("user_id");
--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" ("organization_id");
--> statement-breakpoint
CREATE TABLE "invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "inviter_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "role" text DEFAULT 'employee' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "invitation_organization_email_idx" ON "invitation" ("organization_id", "email");
--> statement-breakpoint
CREATE INDEX "invitation_expires_at_idx" ON "invitation" ("expires_at");
--> statement-breakpoint
CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL,
  "active_organization_id" text,
  CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "session_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "organization"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" ("token");
--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" ("user_id");
--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" ("expires_at");
--> statement-breakpoint
CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamptz,
  "refresh_token_expires_at" timestamptz,
  "scope" text,
  "password" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" ("provider_id", "account_id");
--> statement-breakpoint
CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");
--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" ("expires_at");
--> statement-breakpoint
CREATE TABLE "branch" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "address" text,
  "country" text DEFAULT 'IN' NOT NULL,
  "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
  "latitude" numeric(10, 7),
  "longitude" numeric(10, 7),
  "geofence_radius_meters" integer DEFAULT 150 NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "branch_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE,
  CONSTRAINT "branch_geofence_radius_positive" CHECK ("geofence_radius_meters" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "branch_organization_code_unique" ON "branch" ("organization_id", "code");
--> statement-breakpoint
CREATE INDEX "branch_organization_id_idx" ON "branch" ("organization_id");
--> statement-breakpoint
CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "actor_user_id" text,
  "branch_id" uuid,
  "action" text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "request_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_organization_created_idx" ON "audit_log" ("organization_id", "created_at");
--> statement-breakpoint
CREATE INDEX "audit_log_actor_created_idx" ON "audit_log" ("actor_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" ("organization_id", "resource_type", "resource_id");
--> statement-breakpoint
ALTER TABLE "branch" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "branch" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "branch_tenant_isolation" ON "branch"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), ''))
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "audit_log_tenant_isolation" ON "audit_log"
  USING ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), ''))
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_organization_id', true), ''));

-- Business Sutra Phase 2 / Migration 0001
-- PostgreSQL 15+. Review and apply only to a newly provisioned database.
-- No existing customer, product, financial or attendance records are changed.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE user_status AS ENUM ('active','suspended');
CREATE TYPE membership_role AS ENUM ('owner','admin','manager','employee');
CREATE TYPE membership_status AS ENUM ('invited','active','suspended');
CREATE TABLE app_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auth_provider text NOT NULL, auth_subject text NOT NULL,
 email text NOT NULL, full_name text, status user_status NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT app_users_provider_subject_uq UNIQUE(auth_provider,auth_subject)
);
CREATE INDEX app_users_email_idx ON app_users(email);
CREATE TABLE businesses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
 industry text NOT NULL DEFAULT 'other', country_code text NOT NULL DEFAULT 'IN',
 currency_code text NOT NULL DEFAULT 'INR', timezone text NOT NULL DEFAULT 'Asia/Kolkata',
 phone text, email text, website text, address text, gst_registered boolean NOT NULL DEFAULT false,
 gstin text, legal_business_name text,
 created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz
);
CREATE INDEX businesses_created_by_idx ON businesses(created_by);
CREATE TABLE business_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 role membership_role NOT NULL, status membership_status NOT NULL DEFAULT 'invited',
 invited_at timestamptz NOT NULL DEFAULT now(), joined_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT business_memberships_business_user_uq UNIQUE(business_id,user_id)
);
CREATE INDEX business_memberships_user_status_idx ON business_memberships(user_id,status);
CREATE INDEX business_memberships_business_status_idx ON business_memberships(business_id,status);
CREATE TABLE user_preferences (
 user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 locale text NOT NULL DEFAULT 'en', timezone text NOT NULL DEFAULT 'Asia/Kolkata',
 marketing_emails boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE branches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 code text NOT NULL, name text NOT NULL, address text, timezone text,
 latitude numeric(10,7), longitude numeric(10,7), geofence_radius_meters numeric(8,2),
 is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz,
 CONSTRAINT branches_business_code_uq UNIQUE(business_id,code),
 CONSTRAINT branches_latitude_range CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90),
 CONSTRAINT branches_longitude_range CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180),
 CONSTRAINT branches_geofence_positive CHECK(geofence_radius_meters IS NULL OR geofence_radius_meters > 0)
);
CREATE INDEX branches_business_active_idx ON branches(business_id,is_active);
CREATE TABLE audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
 action text NOT NULL, entity_type text NOT NULL, entity_id text, before_data jsonb, after_data jsonb,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, request_id text,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_business_time_idx ON audit_logs(business_id,occurred_at);
CREATE INDEX audit_logs_entity_idx ON audit_logs(business_id,entity_type,entity_id);
CREATE INDEX audit_logs_actor_time_idx ON audit_logs(actor_user_id,occurred_at);

-- API sets app.user_id transaction-locally after validating a signed provider identity.
CREATE FUNCTION app_current_user_id() RETURNS uuid LANGUAGE sql STABLE
AS $body$ SELECT NULLIF(current_setting('app.user_id',true),'')::uuid $body$;
CREATE FUNCTION app_is_business_member(target_business_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $body$ SELECT EXISTS(SELECT 1 FROM public.business_memberships m WHERE m.business_id=target_business_id
 AND m.user_id=public.app_current_user_id() AND m.status='active') $body$;
CREATE FUNCTION app_has_business_role(target_business_id uuid, allowed_roles membership_role[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $body$ SELECT EXISTS(SELECT 1 FROM public.business_memberships m WHERE m.business_id=target_business_id
 AND m.user_id=public.app_current_user_id() AND m.status='active' AND m.role=ANY(allowed_roles)) $body$;
CREATE FUNCTION app_is_business_creator(target_business_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $body$ SELECT EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=target_business_id
 AND b.created_by=public.app_current_user_id()) $body$;

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_users_select_self ON app_users FOR SELECT USING(id=app_current_user_id());
CREATE POLICY businesses_select_member ON businesses FOR SELECT USING(app_is_business_member(id));
CREATE POLICY businesses_create_self ON businesses FOR INSERT WITH CHECK(created_by=app_current_user_id());
CREATE POLICY businesses_update_admin ON businesses FOR UPDATE
 USING(app_has_business_role(id,ARRAY['owner','admin']::membership_role[]))
 WITH CHECK(app_has_business_role(id,ARRAY['owner','admin']::membership_role[]));

CREATE POLICY memberships_select_scope ON business_memberships FOR SELECT
 USING(user_id=app_current_user_id() OR app_is_business_member(business_id));
CREATE POLICY memberships_insert_scope ON business_memberships FOR INSERT WITH CHECK(
 (role='owner' AND app_is_business_creator(business_id))
 OR (role IN ('manager','employee') AND app_has_business_role(business_id,ARRAY['owner','admin']::membership_role[]))
);
CREATE POLICY memberships_update_scope ON business_memberships FOR UPDATE
 USING(role IN ('manager','employee') AND user_id<>app_current_user_id()
 AND app_has_business_role(business_id,ARRAY['owner','admin']::membership_role[]))
 WITH CHECK(role IN ('manager','employee') AND user_id<>app_current_user_id()
 AND app_has_business_role(business_id,ARRAY['owner','admin']::membership_role[]));
CREATE POLICY memberships_delete_scope ON business_memberships FOR DELETE
 USING(role IN ('manager','employee') AND user_id<>app_current_user_id()
 AND app_has_business_role(business_id,ARRAY['owner','admin']::membership_role[]));

CREATE POLICY user_preferences_self ON user_preferences FOR ALL
 USING(user_id=app_current_user_id()) WITH CHECK(user_id=app_current_user_id());
CREATE POLICY branches_select_member ON branches FOR SELECT USING(app_is_business_member(business_id));
CREATE POLICY branches_insert_admin ON branches FOR INSERT
 WITH CHECK(app_has_business_role(business_id,ARRAY['owner','admin']::membership_role[]));
CREATE POLICY branches_update_admin ON branches FOR UPDATE
 USING(app_has_business_role(business_id,ARRAY['owner','admin']::membership_role[]))
 WITH CHECK(app_has_business_role(business_id,ARRAY['owner','admin']::membership_role[]));
CREATE POLICY audit_logs_select_member ON audit_logs FOR SELECT USING(app_is_business_member(business_id));
CREATE POLICY audit_logs_insert_member ON audit_logs FOR INSERT WITH CHECK(app_is_business_member(business_id) AND (actor_user_id IS NULL OR actor_user_id=app_current_user_id()));
-- Audit logs intentionally have no UPDATE or DELETE policy.
-- Runtime DB role must not own these tables and must not have BYPASSRLS.

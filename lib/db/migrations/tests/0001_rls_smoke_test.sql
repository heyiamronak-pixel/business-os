-- Run after 0001_business_tenant_foundation.sql on a disposable clean database.
INSERT INTO app_users (id,auth_provider,auth_subject,email) VALUES
 ('00000000-0000-4000-8000-000000000001','test','user-a','a@example.test'),
 ('00000000-0000-4000-8000-000000000002','test','user-b','b@example.test');

INSERT INTO businesses (id,name,slug,created_by) VALUES
 ('10000000-0000-4000-8000-000000000001','Business A','business-a','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','Business B','business-b','00000000-0000-4000-8000-000000000002');

INSERT INTO business_memberships (business_id,user_id,role,status) VALUES
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','owner','active'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','owner','active');

INSERT INTO branches (id,business_id,code,name) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','HQ','A HQ'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','HQ','B HQ');

INSERT INTO audit_logs (business_id,actor_user_id,action,entity_type,entity_id)
VALUES ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','created','branch','20000000-0000-4000-8000-000000000002');

GRANT USAGE ON SCHEMA public TO business_sutra_runtime;
GRANT SELECT ON app_users,businesses,business_memberships,user_preferences,branches,audit_logs TO business_sutra_runtime;
GRANT INSERT ON branches,audit_logs TO business_sutra_runtime;
GRANT UPDATE ON audit_logs TO business_sutra_runtime;

-- The API runtime can provision only the Supabase identity it has already
-- verified; the user context is then scoped to that exact UUID.
BEGIN;
SET LOCAL ROLE business_sutra_runtime;
SELECT public.app_sync_authenticated_user(
 '00000000-0000-4000-8000-000000000003'::uuid,
 '00000000-0000-4000-8000-000000000003',
 'sync@example.test',
 'Synced User'
);
SELECT set_config('app.user_id','00000000-0000-4000-8000-000000000003',true);
DO $$BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.app_users
   WHERE id='00000000-0000-4000-8000-000000000003'
     AND auth_provider='supabase'
     AND auth_subject='00000000-0000-4000-8000-000000000003'
 ) THEN
   RAISE EXCEPTION 'Verified identity provisioning failed';
 END IF;
END $$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE business_sutra_runtime;
SELECT set_config('app.user_id','00000000-0000-4000-8000-000000000001',true);
DO $$
DECLARE
  visible_businesses integer;
  visible_branches integer;
  changed_audit_rows integer;
BEGIN
  SELECT count(*) INTO visible_businesses FROM businesses;
  IF visible_businesses <> 1 THEN
    RAISE EXCEPTION 'Tenant isolation failed: user A can see % businesses', visible_businesses;
  END IF;

  SELECT count(*) INTO visible_branches FROM branches;
  IF visible_branches <> 1 THEN
    RAISE EXCEPTION 'Tenant isolation failed: user A can see % branches', visible_branches;
  END IF;

  BEGIN
    INSERT INTO branches (business_id,code,name)
    VALUES ('10000000-0000-4000-8000-000000000002','EVIL','Cross-tenant branch');
    RAISE EXCEPTION 'Tenant isolation failed: cross-tenant insert was allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO business_memberships (business_id,user_id,role,status)
    VALUES ('10000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002','owner','active');
    RAISE EXCEPTION 'Membership escalation failed: a user added another owner';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  IF EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_id='10000000-0000-4000-8000-000000000001'
      AND user_id='00000000-0000-4000-8000-000000000002'
  ) THEN
    RAISE EXCEPTION 'Membership escalation failed: other user was added as owner';
  END IF;

  UPDATE audit_logs SET action='tampered'
  WHERE business_id='10000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS changed_audit_rows = ROW_COUNT;
  IF changed_audit_rows <> 0 THEN
    RAISE EXCEPTION 'Audit immutability failed: updated % rows', changed_audit_rows;
  END IF;
END $$;
ROLLBACK;

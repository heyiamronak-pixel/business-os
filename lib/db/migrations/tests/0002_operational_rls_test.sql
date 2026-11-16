-- Run after migrations 0001 and 0002 using the restricted runtime role.
BEGIN;
SET LOCAL ROLE business_sutra_runtime;
SELECT set_config('app.user_id','00000000-0000-4000-8000-000000000001',true);

INSERT INTO products (id,business_id,name,sku,cost_price,selling_price,stock)
VALUES ('30000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000001','Tenant A product','A-001',10,20,5);

DO $$
DECLARE visible_products integer;
BEGIN
 SELECT count(*) INTO visible_products FROM products;
 IF visible_products <> 1 THEN
  RAISE EXCEPTION 'Operational tenant isolation failed: user A sees % products',visible_products;
 END IF;

 BEGIN
  INSERT INTO products (business_id,name,sku) VALUES
  ('10000000-0000-4000-8000-000000000002','Tenant B product','B-001');
  RAISE EXCEPTION 'Operational tenant isolation failed: cross-tenant product insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN
  NULL;
 END;
END $$;
ROLLBACK;

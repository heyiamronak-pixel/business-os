-- Business Sutra Phase 2 / Migration 0002
-- Tenant-scoped operational records. Apply after 0001 on a clean or migrated DB.
-- Existing browser data is deliberately not imported or deleted by this migration.
BEGIN;

CREATE TABLE products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 name text NOT NULL, sku text NOT NULL DEFAULT '', barcode text NOT NULL DEFAULT '',
 category text NOT NULL DEFAULT '', cost_price numeric(14,2) NOT NULL DEFAULT 0,
 selling_price numeric(14,2) NOT NULL DEFAULT 0, stock numeric(14,3) NOT NULL DEFAULT 0,
 minimum_stock numeric(14,3) NOT NULL DEFAULT 0, unit text NOT NULL DEFAULT 'unit',
 image_data_url text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT products_business_sku_uq UNIQUE(business_id,sku),
 CONSTRAINT products_cost_nonnegative CHECK(cost_price >= 0),
 CONSTRAINT products_selling_nonnegative CHECK(selling_price >= 0),
 CONSTRAINT products_stock_nonnegative CHECK(stock >= 0),
 CONSTRAINT products_min_stock_nonnegative CHECK(minimum_stock >= 0)
);
CREATE INDEX products_business_name_idx ON products(business_id,name);

CREATE TABLE customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 name text NOT NULL, phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_business_name_idx ON customers(business_id,name);
CREATE INDEX customers_business_phone_idx ON customers(business_id,phone);

CREATE TABLE sales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
 subtotal numeric(14,2) NOT NULL, discount numeric(14,2) NOT NULL DEFAULT 0,
 total numeric(14,2) NOT NULL, cost_total numeric(14,2) NOT NULL DEFAULT 0,
 gross_profit numeric(14,2) NOT NULL DEFAULT 0,
 payment_status text NOT NULL CHECK(payment_status IN ('paid','pending','refunded')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT sales_amounts_nonnegative CHECK(subtotal >= 0 AND discount >= 0 AND total >= 0 AND cost_total >= 0)
);
CREATE INDEX sales_business_created_idx ON sales(business_id,created_at DESC);
CREATE INDEX sales_business_customer_idx ON sales(business_id,customer_id);

CREATE TABLE sale_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 product_id uuid REFERENCES products(id) ON DELETE SET NULL,
 product_name text NOT NULL, quantity numeric(14,3) NOT NULL,
 unit_price numeric(14,2) NOT NULL, unit_cost numeric(14,2) NOT NULL DEFAULT 0,
 line_total numeric(14,2) NOT NULL,
 CONSTRAINT sale_items_quantity_positive CHECK(quantity > 0),
 CONSTRAINT sale_items_amounts_nonnegative CHECK(unit_price >= 0 AND unit_cost >= 0 AND line_total >= 0)
);
CREATE INDEX sale_items_business_sale_idx ON sale_items(business_id,sale_id);

CREATE TABLE inventory_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 movement_type text NOT NULL CHECK(movement_type IN ('stock-in','stock-out','adjustment')),
 quantity numeric(14,3) NOT NULL CHECK(quantity <> 0),
 note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_business_product_idx ON inventory_movements(business_id,product_id,created_at DESC);

CREATE TABLE expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 category text NOT NULL, amount numeric(14,2) NOT NULL CHECK(amount >= 0),
 expense_date date NOT NULL, description text NOT NULL DEFAULT '',
 payment_method text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_business_date_idx ON expenses(business_id,expense_date DESC);

CREATE TABLE revenue_targets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 period text NOT NULL CHECK(period IN ('monthly','quarterly','annual')),
 label text NOT NULL, amount numeric(14,2) NOT NULL CHECK(amount >= 0),
 start_date date NOT NULL, end_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT revenue_targets_date_order CHECK(end_date >= start_date)
);
CREATE INDEX revenue_targets_business_period_idx ON revenue_targets(business_id,start_date,end_date);

CREATE TABLE business_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
 title text NOT NULL, description text NOT NULL DEFAULT '',
 assigned_to text NOT NULL DEFAULT '', priority text NOT NULL CHECK(priority IN ('Low','Medium','High')),
 due_date date, reminder timestamptz,
 status text NOT NULL CHECK(status IN ('Todo','In Progress','Completed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_tasks_business_due_idx ON business_tasks(business_id,due_date);

-- Every operational table is isolated by the same server-verified membership
-- context. INSERT/UPDATE/DELETE also require an active business membership.
DO $policies$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY[
  'products','customers','sales','sale_items','inventory_movements',
  'expenses','revenue_targets','business_tasks'
 ] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format(
   'CREATE POLICY %I ON public.%I FOR SELECT USING (public.app_is_business_member(business_id))',
   table_name || '_select_member', table_name
  );
  EXECUTE format(
   'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.app_is_business_member(business_id))',
   table_name || '_insert_member', table_name
  );
  EXECUTE format(
   'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.app_is_business_member(business_id)) WITH CHECK (public.app_is_business_member(business_id))',
   table_name || '_update_member', table_name
  );
  EXECUTE format(
   'CREATE POLICY %I ON public.%I FOR DELETE USING (public.app_is_business_member(business_id))',
   table_name || '_delete_member', table_name
  );
 END LOOP;
END
$policies$;

GRANT SELECT,INSERT,UPDATE,DELETE ON products,customers,sales,sale_items,
 inventory_movements,expenses,revenue_targets,business_tasks TO business_sutra_runtime;

COMMIT;

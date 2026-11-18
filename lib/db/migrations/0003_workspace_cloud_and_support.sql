-- Business Sutra 0003: cloud workspace snapshots and customer support foundation.
-- Apply after 0001 and 0002 in the Supabase SQL Editor.
-- This migration is additive: it does not delete or rewrite existing data.

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_snapshots (
  business_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, user_id),
  CONSTRAINT workspace_snapshots_object CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS workspace_snapshots_user_updated_idx
  ON public.workspace_snapshots(user_id, updated_at DESC);

ALTER TABLE public.workspace_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_snapshots_select_own ON public.workspace_snapshots;
CREATE POLICY workspace_snapshots_select_own ON public.workspace_snapshots
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS workspace_snapshots_insert_own ON public.workspace_snapshots;
CREATE POLICY workspace_snapshots_insert_own ON public.workspace_snapshots
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS workspace_snapshots_update_own ON public.workspace_snapshots;
CREATE POLICY workspace_snapshots_update_own ON public.workspace_snapshots
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS workspace_snapshots_delete_own ON public.workspace_snapshots;
CREATE POLICY workspace_snapshots_delete_own ON public.workspace_snapshots
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_snapshots TO authenticated;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id text,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 4 AND 160),
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_for_customer','resolved','closed')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_updated_idx
  ON public.support_tickets(user_id, updated_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
CREATE POLICY support_tickets_select_own ON public.support_tickets
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS support_tickets_insert_own ON public.support_tickets;
CREATE POLICY support_tickets_insert_own ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 10000),
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_created_idx
  ON public.support_messages(ticket_id, created_at ASC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_messages_select_ticket_owner ON public.support_messages;
CREATE POLICY support_messages_select_ticket_owner ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS support_messages_insert_ticket_owner ON public.support_messages;
CREATE POLICY support_messages_insert_ticket_owner ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_user_id = (SELECT auth.uid())
    AND is_staff = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;

COMMIT;

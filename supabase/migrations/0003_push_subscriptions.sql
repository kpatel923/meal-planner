-- ════════════════════════════════════════════════════════════════════
-- Push notifications — subscription storage
-- Run in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage only their own subscriptions.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='own_subs_select') THEN
    CREATE POLICY own_subs_select ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='own_subs_insert') THEN
    CREATE POLICY own_subs_insert ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='own_subs_update') THEN
    CREATE POLICY own_subs_update ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='own_subs_delete') THEN
    CREATE POLICY own_subs_delete ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Note: the send function uses the service-role key, which bypasses RLS, so it
-- can read all subscriptions to deliver pushes.

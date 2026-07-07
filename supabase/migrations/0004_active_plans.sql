-- ════════════════════════════════════════════════════════════════════
-- Active plan sync — stores each user's CURRENT plan + prep status on the
-- server so reminder functions can personalize (and so plans survive across
-- devices / reinstalls). One row per user.
-- Run in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.active_plans (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_json    JSONB,          -- the weekly plan (day idx -> {cat: meal})
  prep_json    JSONB,          -- prep checkboxes { "0-Breakfast": true }
  servings     INTEGER DEFAULT 2,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.active_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='active_plans' AND policyname='own_active_all') THEN
    CREATE POLICY own_active_all ON public.active_plans
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- The reminder function uses the service-role key (bypasses RLS) to read all
-- users' active plans when composing personalized notifications.

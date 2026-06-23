-- ════════════════════════════════════════════════════════════════════
-- Migration: store time, cost, nutrition on meals + budget on profiles
-- Safe to run on an existing database — every statement uses IF NOT EXISTS,
-- so re-running it does nothing harmful. Run in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- ════════════════════════════════════════════════════════════════════

-- ── MEALS: new optional attributes ──────────────────────────────────
-- All nullable. When NULL, the app falls back to live estimates, so
-- existing recipes keep working unchanged.

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS prep_time        INTEGER,   -- total minutes (prep + cook)
  ADD COLUMN IF NOT EXISTS cost_per_serving NUMERIC(6,2), -- USD, e.g. 3.50
  ADD COLUMN IF NOT EXISTS calories         INTEGER;   -- per serving

-- Light sanity guards (won't fire on NULLs). Wrapped so re-runs don't error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meals_prep_time_nonneg'
  ) THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_prep_time_nonneg
      CHECK (prep_time IS NULL OR prep_time >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meals_cost_nonneg'
  ) THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_cost_nonneg
      CHECK (cost_per_serving IS NULL OR cost_per_serving >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meals_calories_nonneg'
  ) THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_calories_nonneg
      CHECK (calories IS NULL OR calories >= 0);
  END IF;
END $$;

-- ── PROFILES: budget settings ───────────────────────────────────────
-- These power the Budget mode toggle + weekly target in the Profile page.
-- (The app already tries to save these; the columns were missing.)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS budget_mode   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weekly_budget NUMERIC(8,2) DEFAULT 75;

-- Done. No data is modified; only columns are added.

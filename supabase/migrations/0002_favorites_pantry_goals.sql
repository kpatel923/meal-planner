-- ════════════════════════════════════════════════════════════════════
-- Migration 0002 — favorites, leftovers, pantry, nutrition goals
-- Safe to run on an existing database (IF NOT EXISTS everywhere).
-- Run in Supabase → SQL Editor → New query → paste → Run.
-- ════════════════════════════════════════════════════════════════════

-- ── MEALS: favorite flag + leftover servings ────────────────────────
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS is_favorite     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS leftover_days   INTEGER DEFAULT 0;  -- how many extra days this meal covers

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meals_leftover_days_range') THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_leftover_days_range
      CHECK (leftover_days IS NULL OR (leftover_days >= 0 AND leftover_days <= 6));
  END IF;
END $$;

-- ── PROFILES: pantry staples + nutrition goals ──────────────────────
-- pantry_items: JSON array of ingredient names the user keeps stocked, so
-- they're excluded from grocery lists. Stored as text[] for simplicity.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pantry_items    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_calories  INTEGER,   -- target kcal/day, null = no goal
  ADD COLUMN IF NOT EXISTS daily_protein   INTEGER;   -- target g/day, null = no goal

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_daily_cal_nonneg') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_daily_cal_nonneg
      CHECK (daily_calories IS NULL OR daily_calories >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_daily_protein_nonneg') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_daily_protein_nonneg
      CHECK (daily_protein IS NULL OR daily_protein >= 0);
  END IF;
END $$;

-- Done. Columns added only; no existing data touched.

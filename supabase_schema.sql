-- ============================================================
-- MEAL PLANNER — SUPABASE SCHEMA
-- Run this entire file in: Supabase → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────
-- 1. PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  avatar_url  TEXT,
  diet_prefs  TEXT[] DEFAULT ARRAY['veg','vegan','nonveg'],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────
-- 2. MEALS (user-specific recipe library)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name   TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('Breakfast','Lunch','Dinner','Snack')),
  ingredients TEXT NOT NULL,
  diet_type   TEXT NOT NULL CHECK (diet_type IN ('veg','vegan','nonveg')),
  notes       TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. SAVED PLANS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  plan_json   JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
--    Critical: ensures users only see their own data
-- ─────────────────────────────────────────
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_plans ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Meals: full CRUD for own meals only
CREATE POLICY "meals_select_own" ON public.meals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meals_insert_own" ON public.meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meals_update_own" ON public.meals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "meals_delete_own" ON public.meals
  FOR DELETE USING (auth.uid() = user_id);

-- Saved Plans: full CRUD for own plans only
CREATE POLICY "plans_select_own" ON public.saved_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plans_insert_own" ON public.saved_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans_delete_own" ON public.saved_plans
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 5. UPDATED_AT AUTO-TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meals_updated_at
  BEFORE UPDATE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────
-- 6. STORAGE BUCKET (for recipe images + imports)
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-assets', 'meal-assets', false)
ON CONFLICT DO NOTHING;

-- Only authenticated users can upload to their own folder
CREATE POLICY "meal_assets_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'meal-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "meal_assets_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'meal-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "meal_assets_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'meal-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────
-- 7. INDEXES for performance
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS meals_user_id_idx      ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS meals_category_idx     ON public.meals(category);
CREATE INDEX IF NOT EXISTS meals_diet_type_idx    ON public.meals(diet_type);
CREATE INDEX IF NOT EXISTS saved_plans_user_idx   ON public.saved_plans(user_id);

-- ─────────────────────────────────────────
-- DONE ✅
-- ─────────────────────────────────────────


-- ============================================================
-- SCHEMA UPDATE: Household Accounts (#20)
-- Run this block in Supabase SQL Editor after the initial schema
-- ============================================================

-- Households table
CREATE TABLE IF NOT EXISTS public.households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Household members
CREATE TABLE IF NOT EXISTS public.household_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- Shared plans (tied to household, not individual user)
CREATE TABLE IF NOT EXISTS public.shared_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  name         TEXT NOT NULL,
  plan_json    JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_plans      ENABLE ROW LEVEL SECURITY;

-- Households: members can read, owner can update/delete
CREATE POLICY "household_member_read" ON public.households
  FOR SELECT USING (
    id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );
CREATE POLICY "household_owner_insert" ON public.households
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "household_owner_update" ON public.households
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "household_owner_delete" ON public.households
  FOR DELETE USING (auth.uid() = owner_id);

-- Members
CREATE POLICY "members_read" ON public.household_members
  FOR SELECT USING (user_id = auth.uid() OR
    household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "members_insert" ON public.household_members
  FOR INSERT WITH CHECK (
    household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "members_delete" ON public.household_members
  FOR DELETE USING (user_id = auth.uid() OR
    household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));

-- Shared plans: all household members can read, members can insert
CREATE POLICY "shared_plans_read" ON public.shared_plans
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );
CREATE POLICY "shared_plans_insert" ON public.shared_plans
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );
CREATE POLICY "shared_plans_delete" ON public.shared_plans
  FOR DELETE USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS household_members_user_idx ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS household_members_hh_idx   ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS shared_plans_hh_idx        ON public.shared_plans(household_id);

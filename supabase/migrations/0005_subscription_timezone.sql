-- Add timezone to push_subscriptions so reminders compute "today" in the
-- user's local zone instead of UTC. Safe to run once.
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

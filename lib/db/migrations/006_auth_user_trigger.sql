-- ============================================================
-- Wedding List — Migration 006: auth → public.users sync
-- Idempotent. Safe to re-run.
--
-- WHY: public.users rows were not being created on sign-up, so auth.users had
-- records but public.users was empty. Because tenants.owner_id and
-- tenant_members.user_id reference public.users(id), tenant provisioning failed
-- with a FK violation (silently caught), leaving new accounts with no tenant.
--
-- This restores the canonical Supabase pattern: a trigger that mirrors each new
-- auth user into public.users, plus a one-time backfill for users created
-- before the trigger existed.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- One-time backfill: create public.users rows for any existing auth users
-- that are missing one (e.g. the account just registered before this fix).
INSERT INTO public.users (id, email, display_name)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(COALESCE(u.email, ''), '@', 1))
FROM auth.users u
LEFT JOIN public.users pu ON pu.id = u.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Backfills tenant_members.role_id for memberships left with a NULL role.
--
-- Root cause: an earlier version of createWorkspace() looked up the 'owner'
-- role and inserted it into tenant_members.role_id, but if that lookup ever
-- failed silently (or the row was created before the lookup existed) the
-- membership ended up with role_id = NULL. Since is_tenant_admin() requires
-- a joined role named 'owner'/'admin', a NULL role_id makes the tenant
-- creator invisible to their own RLS-protected rows (events, tenant_members,
-- etc.) — manifesting as "No active event found for tenant" and an empty
-- sidebar even though the membership itself is active.
DO $$
DECLARE
  v_owner_role_id uuid;
BEGIN
  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
  IF v_owner_role_id IS NULL THEN
    RAISE NOTICE 'No owner role found — skipping backfill.';
    RETURN;
  END IF;

  UPDATE public.tenant_members tm
  SET role_id = v_owner_role_id
  FROM public.tenants t
  WHERE tm.tenant_id = t.id
    AND tm.user_id = t.owner_id
    AND tm.role_id IS NULL;
END $$;

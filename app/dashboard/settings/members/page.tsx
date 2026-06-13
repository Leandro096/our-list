import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { getActiveContext } from '@/lib/server-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

import { getTenantMembers } from '@/services/tenant.service';
import { getRolesWithPermissions } from '@/services/user.service';

import { TenantMembersManager } from '@/components/settings/tenant-members';

export const metadata = { title: 'Miembros — Wedding List' };

export default async function MembersPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getActiveContext>>;
  try {
    ctx = await getActiveContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  if (!hasPermission(ctx.permissions, PERMISSIONS.SETTINGS_MEMBERS_INVITE, ctx.isSuperAdmin)) {
    redirect('/dashboard');
  }

  const [members, roles] = await Promise.all([
    getTenantMembers(supabase, ctx.tenantId),
    getRolesWithPermissions(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Miembros del Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona quién tiene acceso a este workspace.
        </p>
      </div>
      <TenantMembersManager members={members} roles={roles} />
    </div>
  );
}

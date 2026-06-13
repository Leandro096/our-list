import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { getPlatformContext } from '@/lib/server-auth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '@/lib/permissions';

import { getPlatformRoles, getPlatformUsers } from '@/services/platform.service';

import { RolesManager } from '@/components/admin/roles-manager';

export const metadata = { title: 'Roles de plataforma — Admin' };

export default async function AdminRolesPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getPlatformContext>>;
  try {
    ctx = await getPlatformContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  if (!hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.ROLES_MANAGE)) {
    redirect('/admin');
  }

  const [roles, users] = await Promise.all([
    getPlatformRoles(supabase),
    getPlatformUsers(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roles de plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de roles de backoffice y usuarios con permisos de plataforma.
        </p>
      </div>

      <RolesManager roles={roles} users={users} />
    </div>
  );
}

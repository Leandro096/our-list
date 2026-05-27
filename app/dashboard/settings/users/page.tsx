import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

import { getRoles, getUsersWithRoles } from '@/services';

import { PageHeader } from '@/components/page-header';
import { UserManagement } from '@/components/settings/user-management';

export default async function UsersSettingsPage() {
  // 1. Verify the current user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // 2. Fetch the current user's profile to check permissions
  const { data: profile } = await supabase
    .from('users')
    .select(
      `
      is_super_admin,
      user_roles!user_roles_user_id_fkey(
        roles(
          role_permissions(
            permissions(scope)
          )
        )
      )
    `
    )
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/auth/login');

  type RoleRow = {
    role_permissions: Array<{ permissions: { scope: string } | null }>;
  };

  const userPermissions = [
    ...new Set(
      (profile.user_roles as unknown as Array<{ roles: RoleRow | null }>)
        ?.flatMap((ur) => ur.roles?.role_permissions ?? [])
        .map((rp) => rp.permissions?.scope)
        .filter((scope): scope is string => Boolean(scope)) ?? []
    ),
  ];

  const canManageUsers = hasPermission(
    userPermissions,
    PERMISSIONS.SETTINGS_USERS,
    profile.is_super_admin
  );

  if (!canManageUsers) redirect('/dashboard');

  // 3. Use the regular client to read all users (RLS policy allows authenticated users to read all rows)
  const [users, roles] = await Promise.all([getUsersWithRoles(supabase), getRoles(supabase)]);

  return (
    <div className="space-y-6">
      <PageHeader
        titleKey="settings.users_section.title"
        descriptionKey="settings.usersDescription"
      />
      <UserManagement users={users} roles={roles} />
    </div>
  );
}

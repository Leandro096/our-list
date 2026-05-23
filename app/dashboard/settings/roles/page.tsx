import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { RolesManager } from "@/components/settings/roles-manager";
import { getRolesWithPermissions, getAllPermissions } from "@/services";

export default async function RolesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
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
    `,
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  type RoleRow = {
    role_permissions: Array<{ permissions: { scope: string } | null }>;
  };

  const userPermissions = [
    ...new Set(
      (profile.user_roles as unknown as Array<{ roles: RoleRow | null }>)
        ?.flatMap((ur) => ur.roles?.role_permissions ?? [])
        .map((rp) => rp.permissions?.scope)
        .filter((scope): scope is string => Boolean(scope)) ?? [],
    ),
  ];

  const canManageRoles = hasPermission(
    userPermissions,
    PERMISSIONS.SETTINGS_ROLES,
    profile.is_super_admin,
  );

  if (!canManageRoles) redirect("/dashboard");

  const [roles, permissions] = await Promise.all([
    getRolesWithPermissions(supabase),
    getAllPermissions(supabase),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titleKey="settings.roles_section.pageTitle"
        descriptionKey="settings.rolesDescription"
      />
      <RolesManager roles={roles} permissions={permissions} />
    </div>
  );
}

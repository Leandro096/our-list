import { createClient } from '@/lib/supabase/server'
import { UserManagement } from '@/components/settings/user-management'
import { getUsersWithRoles, getRoles } from '@/services'
import { PageHeader } from '@/components/page-header'

export default async function UsersSettingsPage() {
  const supabase = await createClient()
  const [users, roles] = await Promise.all([
    getUsersWithRoles(supabase),
    getRoles(supabase),
  ])

  return (
    <div className="space-y-6">
      <PageHeader titleKey="settings.users_section.title" descriptionKey="settings.usersDescription" />
      <UserManagement users={users} roles={roles} />
    </div>
  )
}

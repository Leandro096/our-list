'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

import { assignRole } from '@/services'

/**
 * Sends a Supabase invite email to `email` and, if a `roleId` is provided,
 * immediately assigns that role to the newly created user record.
 */
export async function inviteUserAction(email: string, roleId: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
    'http://localhost:3000'

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  })

  if (error) throw error

  if (roleId && data.user) {
    await assignRole(supabase, data.user.id, roleId)
  }
}

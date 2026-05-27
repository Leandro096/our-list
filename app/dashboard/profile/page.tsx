import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import type { UserWithRoles } from '@/lib';

import { PageHeader } from '@/components/page-header';
import { ProfileForm } from '@/components/settings/profile-form';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('users')
    .select(
      `
      *,
      user_roles!user_roles_user_id_fkey(
        role_id,
        roles(id, name, description)
      )
    `
    )
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/auth/login');

  return (
    <div className="space-y-6">
      <PageHeader titleKey="profile.title" descriptionKey="profile.description" />
      <div className="max-w-2xl">
        <ProfileForm profile={profile as unknown as UserWithRoles} />
      </div>
    </div>
  );
}

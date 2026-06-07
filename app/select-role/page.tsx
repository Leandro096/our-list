import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';

import { getInitialProfile } from '@/services/user.service';

import { AuthProvider } from '@/components/auth-provider';

import SelectRoleClientPage from './_content';

export const metadata: Metadata = {
  title: 'Select Role — Wedding List',
  description: 'Choose your role to access the wedding guest management platform.',
};

export default async function SelectRolePage() {
  // Resolve the user AND full profile server-side so AuthProvider never needs
  // to call getUser() / fetchProfile() on the client (avoids the 8-second hang).
  const supabase = await createClient();
  const {
    data: { user: initialUser },
  } = await supabase.auth.getUser();
  const initialProfile = initialUser ? await getInitialProfile(supabase, initialUser.id) : null;

  return (
    <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
      <SelectRoleClientPage />
    </AuthProvider>
  );
}

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { userHasActiveMembership } from '@/lib/provision-tenant';

import { getPlans } from '@/services/plan.service';

import { OnboardingForm } from '@/components/onboarding/onboarding-form';

export const metadata = { title: 'Crea tu workspace — Wedding List' };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');
  if (await userHasActiveMembership(supabase, user.id)) redirect('/dashboard');

  // Plans are a public catalogue; read via admin client to avoid any RLS edge.
  const plans = await getPlans(createAdminClient());

  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const defaultType =
    meta.tenant_type === 'organization' || meta.tenant_type === 'individual'
      ? meta.tenant_type
      : 'individual';

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl font-semibold">Crea tu workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configura tu espacio y elige un plan para empezar a gestionar tu evento.
          </p>
        </div>
        <OnboardingForm
          plans={plans}
          defaultName={meta.workspace_name ?? ''}
          defaultType={defaultType}
        />
      </div>
    </main>
  );
}

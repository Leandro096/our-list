import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { getPlatformContext } from '@/lib/server-auth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '@/lib/permissions';

import { getGlobalStatuses } from '@/services/status.service';
import { getGlobalSessions } from '@/services/session.service';

import { GlobalsManager } from '@/components/admin/globals-manager';

export const metadata = { title: 'Globales — Admin' };

export default async function AdminGlobalsPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getPlatformContext>>;
  try {
    ctx = await getPlatformContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  if (!hasPlatformPermission(ctx.platformPermissions, PLATFORM_PERMISSIONS.GLOBALS_MANAGE)) {
    redirect('/admin');
  }

  const [statuses, sessions] = await Promise.all([
    getGlobalStatuses(supabase),
    getGlobalSessions(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Globales</h1>
        <p className="text-sm text-muted-foreground">
          Estados de invitado y sesiones de evento disponibles para todos los tenants.
        </p>
      </div>

      <GlobalsManager statuses={statuses} sessions={sessions} />
    </div>
  );
}

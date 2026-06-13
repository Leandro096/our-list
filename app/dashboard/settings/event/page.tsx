import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { getActiveContext } from '@/lib/server-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

import { getStatusesForEvent } from '@/services/status.service';
import { getSessionsForEvent } from '@/services/session.service';

import { EventConfig } from '@/components/settings/event-config';

export const metadata = { title: 'Configuración del evento — Wedding List' };

export default async function EventSettingsPage() {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof getActiveContext>>;
  try {
    ctx = await getActiveContext(supabase);
  } catch {
    redirect('/auth/login');
  }

  const canEditStatuses = hasPermission(
    ctx.permissions,
    PERMISSIONS.STATUSES_MANAGE_CREATE,
    ctx.isSuperAdmin
  );
  const canEditSessions = hasPermission(
    ctx.permissions,
    PERMISSIONS.SESSIONS_MANAGE_CREATE,
    ctx.isSuperAdmin
  );

  if (!canEditStatuses && !canEditSessions) {
    redirect('/dashboard');
  }

  const [statuses, sessions] = await Promise.all([
    getStatusesForEvent(supabase, ctx.eventId, ctx.tenantId),
    getSessionsForEvent(supabase, ctx.eventId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración del evento</h1>
        <p className="text-sm text-muted-foreground">
          Personaliza los estados de invitado y las sesiones de tu evento. Los globales son de solo
          lectura.
        </p>
      </div>

      <EventConfig
        statuses={statuses}
        sessions={sessions}
        canEditStatuses={canEditStatuses}
        canEditSessions={canEditSessions}
      />
    </div>
  );
}

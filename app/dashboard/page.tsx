import { createClient } from '@/lib/supabase/server';
import { ForbiddenError, getActiveContext } from '@/lib/server-auth';

import { getDashboardStats } from '@/services';

import { PageHeader } from '@/components/page-header';
import { CreateFirstEvent } from '@/components/dashboard/create-first-event';
import { DashboardRealtime } from '@/components/dashboard/dashboard-realtime';

export default async function DashboardPage() {
  const supabase = await createClient();

  let ctx;
  try {
    ctx = await getActiveContext(supabase);
  } catch (err) {
    // No active event for the tenant yet — offer to create one instead of
    // crashing into the error boundary. Any other error (e.g. no active
    // membership) still propagates to app/dashboard/error.tsx.
    if (err instanceof ForbiddenError && err.message === 'No active event found for tenant') {
      return (
        <div className="space-y-8">
          <PageHeader titleKey="dashboard.title" descriptionKey="dashboard.description" />
          <CreateFirstEvent />
        </div>
      );
    }
    throw err;
  }

  const stats = await getDashboardStats(supabase, ctx.eventId);

  return (
    <div className="space-y-8">
      <PageHeader titleKey="dashboard.title" descriptionKey="dashboard.description" />
      <DashboardRealtime initialStats={stats} />
    </div>
  );
}

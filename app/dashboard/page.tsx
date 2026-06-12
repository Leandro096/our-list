import { createClient } from '@/lib/supabase/server';
import { getActiveContext } from '@/lib/server-auth';

import { getDashboardStats } from '@/services';

import { PageHeader } from '@/components/page-header';
import { DashboardRealtime } from '@/components/dashboard/dashboard-realtime';

export default async function DashboardPage() {
  const supabase = await createClient();
  const ctx = await getActiveContext(supabase);
  const stats = await getDashboardStats(supabase, ctx.eventId);

  return (
    <div className="space-y-8">
      <PageHeader titleKey="dashboard.title" descriptionKey="dashboard.description" />
      <DashboardRealtime initialStats={stats} />
    </div>
  );
}

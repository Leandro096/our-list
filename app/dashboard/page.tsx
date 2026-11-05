import { createClient } from '@/lib/supabase/server';

import { getDashboardStats } from '@/services';

import { DashboardRealtime } from '@/components/dashboard/dashboard-realtime';

export default async function DashboardPage() {
  const supabase = await createClient();
  const [stats, { count: unsent }, { data: attendance }] = await Promise.all([
    getDashboardStats(supabase),
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .is('parent_guest_id', null)
      .is('invitation_sent_at', null),
    supabase
      .from('guests')
      .select('event_attendance(event_type), guest_categories(categories(name))')
      .limit(5000),
  ]);

  // Same rule as the totals: reception = has a reception row (alone or with the ceremony);
  // ceremony only = has a ceremony row and no reception row.
  const byReception: Record<string, number> = {};
  const byCeremonyOnly: Record<string, number> = {};
  for (const guest of attendance ?? []) {
    const types = new Set(
      ((guest.event_attendance ?? []) as Array<{ event_type: string }>).map((e) => e.event_type)
    );
    const goesToReception = types.has('reception');
    const ceremonyOnly = types.has('ceremony') && !goesToReception;
    if (!goesToReception && !ceremonyOnly) continue;
    for (const row of (guest.guest_categories ?? []) as unknown as Array<{
      categories: { name: string } | null;
    }>) {
      const name = row.categories?.name;
      if (!name) continue;
      if (goesToReception) byReception[name] = (byReception[name] ?? 0) + 1;
      if (ceremonyOnly) byCeremonyOnly[name] = (byCeremonyOnly[name] ?? 0) + 1;
    }
  }

  return (
    <DashboardRealtime
      initialStats={stats}
      unsentInvitations={unsent ?? 0}
      categoryBreakdown={{ reception: byReception, ceremonyOnly: byCeremonyOnly }}
    />
  );
}

import { createClient } from '@/lib/supabase/server';

import { getCategories, getDashboardStats, getGuestsPaginatedWithFamily } from '@/services';

import { PageHeader } from '@/components/page-header';
import { GuestList } from '@/components/guests/guest-list';

const VALID_SORT = ['first_name', 'last_name', 'status', 'created_at'] as const;
type SortBy = (typeof VALID_SORT)[number];

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const categoryIds = (params.category ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== 'all');

  const eventTypes = (params.events ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v === 'ceremony' || v === 'reception' || v === 'none');

  const sortBy = (
    VALID_SORT.includes(params.sort as SortBy) ? params.sort : 'first_name'
  ) as SortBy;
  const sortOrder = params.order === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, parseInt(params.page ?? '1') || 1);
  const size = [50, 100, 300].includes(parseInt(params.size ?? '')) ? parseInt(params.size!) : 50;

  const supabase = await createClient();
  const [{ data: pageGuests, count }, categories, stats] = await Promise.all([
    getGuestsPaginatedWithFamily(supabase, {
      search: params.q,
      status: params.status,
      categoryIds,
      eventTypes,
      sortBy,
      sortOrder,
      page,
      pageSize: size,
    }),
    getCategories(supabase),
    getDashboardStats(supabase),
  ]);
  const statusCounts = Object.fromEntries(
    stats.guestsByStatus.map((s) => [s.status.toLowerCase(), s.count])
  );

  // The paginated list function does not return the save-the-date fields, so fetch them for this page.
  const { data: shareFields } = await supabase
    .from('guests')
    .select('id, short_code, invitation_sent_at')
    .in(
      'id',
      pageGuests.map((g) => g.id)
    );
  const shareById = new Map((shareFields ?? []).map((row) => [row.id, row]));

  // First names of the people under each guest, so shared messages can use the plural.
  const { data: memberRows } = await supabase
    .from('guests')
    .select('parent_guest_id, first_name')
    .in(
      'parent_guest_id',
      pageGuests.map((g) => g.id)
    )
    .order('first_name');
  const membersByParent = new Map<string, string[]>();
  for (const row of memberRows ?? []) {
    membersByParent.set(row.parent_guest_id, [
      ...(membersByParent.get(row.parent_guest_id) ?? []),
      row.first_name,
    ]);
  }

  const guests = pageGuests.map((g) => ({
    ...g,
    ...shareById.get(g.id),
    members: membersByParent.get(g.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titleKey="guests.title"
        descriptionKey="guests.description"
        actionKey="guests.addGuest"
        actionHref="/dashboard/guests?guest=new"
      />
      <GuestList
        guests={guests}
        statusCounts={statusCounts}
        categories={categories}
        totalCount={count}
        currentParams={{
          q: params.q ?? '',
          status: params.status ?? 'all',
          categoryIds,
          eventTypes,
          sort: sortBy,
          order: sortOrder,
          page,
          size,
        }}
      />
    </div>
  );
}

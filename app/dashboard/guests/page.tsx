import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GuestList } from '@/components/guests/guest-list';
import { getGuestsPaginatedWithFamily, getCategories } from '@/services';

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

  const sortBy = (
    VALID_SORT.includes(params.sort as SortBy) ? params.sort : 'first_name'
  ) as SortBy;
  const sortOrder = params.order === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, parseInt(params.page ?? '1') || 1);
  const size = [50, 100, 300].includes(parseInt(params.size ?? '')) ? parseInt(params.size!) : 50;

  const supabase = await createClient();
  const [{ data: guests, count }, categories] = await Promise.all([
    getGuestsPaginatedWithFamily(supabase, {
      search: params.q,
      status: params.status,
      categoryIds,
      sortBy,
      sortOrder,
      page,
      pageSize: size,
    }),
    getCategories(supabase),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titleKey="guests.title"
        descriptionKey="guests.description"
        actionKey="guests.addGuest"
        actionHref="/dashboard/guests/new"
      />
      <GuestList
        guests={guests}
        categories={categories}
        totalCount={count}
        currentParams={{
          q: params.q ?? '',
          status: params.status ?? 'all',
          categoryIds,
          sort: sortBy,
          order: sortOrder,
          page,
          size,
        }}
      />
    </div>
  );
}

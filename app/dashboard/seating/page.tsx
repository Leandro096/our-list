import { createClient } from '@/lib/supabase/server';
import { getActiveContext } from '@/lib/server-auth';

import { getSeatingDataWithFamily } from '@/services';

import { PageHeader } from '@/components/page-header';
import { SeatingManager } from '@/components/seating/seating-manager';

export default async function SeatingPage() {
  const supabase = await createClient();
  const ctx = await getActiveContext(supabase);
  const { guests, assignments, tables } = await getSeatingDataWithFamily(supabase, ctx.eventId);

  return (
    <div className="space-y-6">
      <PageHeader titleKey="seating.title" descriptionKey="seating.description" />
      <SeatingManager guests={guests} assignments={assignments} tables={tables} />
    </div>
  );
}

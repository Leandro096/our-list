import { createClient } from "@/lib/supabase/server";

import { getSeatingDataWithFamily } from "@/services";

import { PageHeader } from "@/components/page-header";
import { SeatingManager } from "@/components/seating/seating-manager";

export default async function SeatingPage() {
  const supabase = await createClient();
  const { guests, assignments, tables } = await getSeatingDataWithFamily(supabase);

  return (
    <div className="space-y-6">
      <PageHeader
        titleKey="seating.title"
        descriptionKey="seating.description"
      />
      <SeatingManager
        guests={guests}
        assignments={assignments}
        tables={tables}
      />
    </div>
  );
}

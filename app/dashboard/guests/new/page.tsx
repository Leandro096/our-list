import { getCategories } from "@/services";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { GuestForm } from "@/components/guests/guest-form";

export default async function NewGuestPage() {
  const supabase = await createClient();
  const categories = await getCategories(supabase);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        titleKey="guests.newGuest"
        descriptionKey="guests.newDescription"
      />
      <GuestForm categories={categories} />
    </div>
  );
}

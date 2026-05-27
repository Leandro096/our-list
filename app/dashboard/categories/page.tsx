import { createClient } from "@/lib/supabase/server";

import { getCategoriesWithGuestCount } from "@/services";

import { PageHeader } from "@/components/page-header";
import { CategoriesManager } from "@/components/categories/categories-manager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const categories = await getCategoriesWithGuestCount(supabase);

  return (
    <div className="space-y-6">
      <PageHeader
        titleKey="categories.title"
        descriptionKey="categories.description"
      />
      <CategoriesManager categories={categories} />
    </div>
  );
}

import { getDashboardStats } from "@/services";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DashboardRealtime } from "@/components/dashboard/dashboard-realtime";

export default async function DashboardPage() {
  const supabase = await createClient();
  const stats = await getDashboardStats(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        titleKey="dashboard.title"
        descriptionKey="dashboard.description"
      />
      <DashboardRealtime initialStats={stats} />
    </div>
  );
}

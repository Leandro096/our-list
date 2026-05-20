import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { getDashboardStats } from '@/services'
import { PageHeader } from '@/components/page-header'

export default async function DashboardPage() {
  const supabase = await createClient()
  const stats = await getDashboardStats(supabase)

  return (
    <div className="space-y-8">
      <PageHeader titleKey="dashboard.title" descriptionKey="dashboard.description" />
      <DashboardContent stats={stats} />
    </div>
  )
}

import { createClient } from "@/lib/supabase/server";
import { ScanHistoryList } from "@/components/scanner/scan-history-list";
import { getScanHistory } from "@/services";
import { PageHeader } from "@/components/page-header";

export default async function ScanHistoryPage() {
  const supabase = await createClient();
  const scanLogs = await getScanHistory(supabase);

  return (
    <div className="space-y-6">
      <PageHeader titleKey="scanner.history" descriptionKey="scanner.historyDescription" />
      <ScanHistoryList scanLogs={scanLogs} />
    </div>
  );
}

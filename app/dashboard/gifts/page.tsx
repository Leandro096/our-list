import { createClient } from '@/lib/supabase/server';

import { PageHeader } from '@/components/page-header';
import {
  GiftsManager,
  type GiftLinkRow,
  type BankAccountRow,
} from '@/components/gifts/gifts-manager';

export default async function GiftsPage() {
  const supabase = await createClient();
  const [accounts, links] = await Promise.all([
    supabase
      .from('bank_accounts')
      .select('*')
      .order('holder_id')
      .order('sort_order')
      .order('created_at'),
    supabase.from('gift_links').select('*').order('sort_order').order('created_at'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader titleKey="gifts.title" descriptionKey="gifts.description" />
      <GiftsManager
        accounts={(accounts.data ?? []) as BankAccountRow[]}
        links={(links.data ?? []) as GiftLinkRow[]}
        missingTables={Boolean(accounts.error || links.error)}
      />
    </div>
  );
}

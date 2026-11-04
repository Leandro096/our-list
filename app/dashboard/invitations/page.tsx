import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

import { PageHeader } from '@/components/page-header';
import { InvitationsManager } from '@/components/invitations/invitations-manager';

export default async function InvitationsPage() {
  const supabase = await createClient();

  const [{ data: guests }, { data: members }, headersList] = await Promise.all([
    supabase
      .from('guests')
      .select('id, first_name, last_name, phone, short_code, invitation_sent_at, status')
      .is('parent_guest_id', null)
      .order('first_name'),
    supabase.from('guests').select('parent_guest_id').not('parent_guest_id', 'is', null),
    headers(),
  ]);

  const familyCount = new Map<string, number>();
  for (const row of members ?? []) {
    familyCount.set(row.parent_guest_id, (familyCount.get(row.parent_guest_id) ?? 0) + 1);
  }

  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
  const proto =
    headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;

  return (
    <div className="space-y-6">
      <PageHeader titleKey="invitations.title" descriptionKey="invitations.description" />
      <InvitationsManager
        siteUrl={siteUrl}
        guests={(guests ?? []).map((g) => ({ ...g, family: familyCount.get(g.id) ?? 0 }))}
      />
    </div>
  );
}

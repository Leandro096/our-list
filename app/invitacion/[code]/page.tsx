import Link from 'next/link';
import type { Metadata } from 'next';
import { Pinyon_Script, Cormorant_Garamond } from 'next/font/google';

import { createAdminClient } from '@/lib/supabase/admin';
import { COUPLE_NAMES, INVITATION_PHOTOS, SHORT_CODE_PATTERN } from '@/lib/invitation';

import { I18nText } from '@/components/guests/i18n-text';
import { PassExperience } from '@/components/invitation/pass-experience';
import { InvitationInvalid } from '@/components/guests/invitation-invalid';
import type { PublicGiftLink, PublicBankAccount } from '@/components/invitation/gifts-section';

const invitationFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-invitation',
});

export const metadata: Metadata = {
  title: `${COUPLE_NAMES} — Invitación`,
  robots: { index: false, follow: false },
  openGraph: { images: [INVITATION_PHOTOS.hero] },
};

const scriptFont = Pinyon_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
});

const themeVars = {
  '--background': '#fdfbf7',
  '--foreground': '#3b2a1f',
  '--card': '#ffffff',
  '--card-foreground': '#3b2a1f',
  '--primary': '#5a4030',
  '--primary-foreground': '#fdfbf7',
  '--muted': '#f3ece0',
  '--muted-foreground': '#7a6652',
  '--border': '#e4d9c6',
  '--input': '#e4d9c6',
  '--ring': '#c9a24b',
  '--accent': '#efe5d3',
  '--accent-foreground': '#3b2a1f',
} as React.CSSProperties;

type EventType = 'ceremony' | 'reception' | 'both';

async function loadPass(code: string) {
  if (!SHORT_CODE_PATTERN.test(code)) return null;
  const supabase = createAdminClient();

  const { data: guest } = await supabase
    .from('guests')
    .select(
      'id, invitation_guid, short_code, first_name, last_name, status, parent_guest_id, event_attendance(event_type)'
    )
    .eq('short_code', code)
    .maybeSingle();
  if (!guest) return null;

  const rootId = guest.parent_guest_id ?? guest.id;
  const [{ data: root }, { data: children }, accounts, links] = await Promise.all([
    supabase.from('guests').select('id, first_name, last_name, status').eq('id', rootId).single(),
    supabase
      .from('guests')
      .select('id, first_name, last_name, status')
      .eq('parent_guest_id', rootId)
      .order('first_name'),
    // These tables come from supabase/migrations/20261104_gifts.sql; until it runs, show no gifts.
    supabase.from('bank_accounts').select('*').order('sort_order').order('created_at'),
    supabase.from('gift_links').select('*').order('sort_order').order('created_at'),
  ]);

  const members = [root, ...(children ?? [])]
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .filter((m) => m.status === 'confirmed');

  const events = new Set(
    ((guest.event_attendance ?? []) as Array<{ event_type: EventType }>).map((e) => e.event_type)
  );

  return {
    guest,
    members,
    accounts: (accounts.error ? [] : (accounts.data ?? [])) as PublicBankAccount[],
    links: (links.error ? [] : (links.data ?? [])) as PublicGiftLink[],
    showCeremony: events.has('ceremony') || events.has('both'),
    showReception: events.has('reception') || events.has('both'),
  };
}

export default async function InvitationPassPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const pass = await loadPass(code.toLowerCase());

  return (
    <div
      style={themeVars}
      className={`${invitationFont.variable} ${scriptFont.variable} min-h-svh bg-background text-foreground`}
    >
      {!pass ? (
        <InvitationInvalid />
      ) : pass.guest.status !== 'confirmed' ? (
        <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 text-center">
          <p className="font-[family-name:var(--font-invitation)] text-xl italic">{COUPLE_NAMES}</p>
          <h1 className="mt-3 font-[family-name:var(--font-invitation)] text-4xl font-medium">
            <I18nText k="invitations.page.pass.notConfirmedTitle" />
          </h1>
          <p className="mt-3 text-muted-foreground">
            <I18nText k="invitations.page.pass.notConfirmedBody" />
          </p>
          <Link
            href={`/i/${pass.guest.short_code}`}
            className="mt-6 inline-flex h-11 items-center justify-center self-center rounded-md bg-primary px-6 text-primary-foreground"
          >
            <I18nText k="invitations.page.pass.goConfirm" />
          </Link>
        </main>
      ) : (
        <PassExperience
          code={pass.guest.short_code}
          guid={pass.guest.invitation_guid}
          firstName={pass.guest.first_name}
          members={pass.members.map((m) => `${m.first_name} ${m.last_name}`.trim())}
          showCeremony={pass.showCeremony}
          showReception={pass.showReception}
          accounts={pass.accounts}
          links={pass.links}
          portalTheme={{
            className: `${invitationFont.variable} ${scriptFont.variable}`,
            style: themeVars,
          }}
        />
      )}
    </div>
  );
}

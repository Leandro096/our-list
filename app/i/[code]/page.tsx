import Link from 'next/link';
import type { Metadata } from 'next';
import { Cormorant_Garamond } from 'next/font/google';

import { createAdminClient } from '@/lib/supabase/admin';
import { COUPLE_NAMES, INVITATION_PHOTOS, SHORT_CODE_PATTERN } from '@/lib/invitation';

import { getPublicRsvpDetails } from '@/app/rsvp/actions';

import { I18nText } from '@/components/guests/i18n-text';
import { RsvpClosed } from '@/components/guests/rsvp-closed';
import { LanguageSwitcher } from '@/components/language-switcher';
import { InvitationHero } from '@/components/guests/invitation-hero';
import { PublicRsvpFlow } from '@/components/guests/public-rsvp-flow';
import { InvitationInvalid } from '@/components/guests/invitation-invalid';
import { InvitationPhotoStrip } from '@/components/guests/invitation-photo-strip';

const invitationFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-invitation',
});

export const metadata: Metadata = {
  title: `${COUPLE_NAMES} — RSVP`,
  robots: { index: false, follow: false },
  openGraph: { images: [INVITATION_PHOTOS.hero] },
};

// White, browns, khaki and beige from the photos; gold stays under ~5% of the surface.
const themeVars = {
  '--inv-ink': '#3b2a1f',
  '--inv-paper': '#fdfbf7',
  '--inv-gold': '#c9a24b',
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
  '--sage': '#a8936f',
} as React.CSSProperties;

async function findGuest(code: string) {
  if (!SHORT_CODE_PATTERN.test(code)) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('guests')
    .select('invitation_guid, first_name, last_name, status')
    .eq('short_code', code)
    .maybeSingle();
  return data;
}

export default async function InvitationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const isRsvpEnabled = process.env.NEXT_PUBLIC_RSVP_ENABLED !== 'false';
  const guest = await findGuest(code.toLowerCase());
  const details = guest ? await getPublicRsvpDetails(guest.invitation_guid) : null;

  return (
    <div
      style={themeVars}
      className={`${invitationFont.variable} min-h-svh bg-background text-foreground`}
    >
      <style>{`
        @keyframes inv-photo { from { opacity: 0; transform: scale(1.08); } to { opacity: 1; transform: scale(1); } }
        @keyframes inv-rise { from { opacity: 0; transform: translateY(1.1rem); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
        @keyframes inv-rule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .inv-photo { animation: inv-photo 1.2s cubic-bezier(.16,.84,.3,1) both; }
        .inv-rise { animation: inv-rise 1.1s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d, 0s); }
        .inv-rule { transform-origin: left; animation: inv-rule 1.4s cubic-bezier(.6,0,.2,1) both; animation-delay: var(--d, 0s); }
        .inv-reveal { opacity: 0; clip-path: inset(12% 0 0 0); transform: translateY(1rem); transition: opacity 1s ease, clip-path 1.2s cubic-bezier(.2,.7,.2,1), transform 1.2s cubic-bezier(.2,.7,.2,1); transition-delay: var(--d, 0s); }
        .inv-reveal[data-visible='true'] { opacity: 1; clip-path: inset(0); transform: none; }
        @media (prefers-reduced-motion: reduce) {
          .inv-photo, .inv-rise, .inv-rule { animation: none; }
          .inv-reveal { opacity: 1; clip-path: none; transform: none; transition: none; }
        }
      `}</style>

      {!guest ? (
        <InvitationInvalid />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <InvitationHero fullName={`${guest.first_name} ${guest.last_name}`.trim()} />
          <main className="relative -mt-8 rounded-t-[2rem] bg-background px-4 pb-16 pt-6 sm:px-8 lg:mt-0 lg:rounded-none lg:px-12 lg:pt-10">
            <div className="mx-auto mb-6 flex w-full max-w-2xl justify-end">
              <LanguageSwitcher />
            </div>
            {guest.status === 'confirmed' && (
              <div className="mx-auto mb-6 w-full max-w-2xl">
                <Link
                  href={`/invitacion/${code.toLowerCase()}`}
                  className="flex h-12 items-center justify-center rounded-md bg-primary px-6 text-primary-foreground"
                >
                  <I18nText k="invitations.page.pass.openInvitation" />
                </Link>
              </div>
            )}
            {isRsvpEnabled ? (
              <PublicRsvpFlow
                invitationGuid={guest.invitation_guid}
                initialProfile={details?.ok ? details.data : undefined}
              />
            ) : (
              <RsvpClosed />
            )}
            <InvitationPhotoStrip />
          </main>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from 'next';

import { RsvpClosed } from '@/components/guests/rsvp-closed';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PublicRsvpFlow } from '@/components/guests/public-rsvp-flow';

export const metadata: Metadata = {
  title: 'RSVP — Wedding List',
  description: 'Confirm your attendance to the wedding event.',
  robots: { index: false, follow: false },
};

export default function PublicRsvpPage() {
  const isRsvpEnabled = process.env.NEXT_PUBLIC_RSVP_ENABLED !== 'false';

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto mb-6 flex w-full max-w-2xl justify-end">
        <LanguageSwitcher />
      </div>
      {isRsvpEnabled ? <PublicRsvpFlow /> : <RsvpClosed />}
    </main>
  );
}

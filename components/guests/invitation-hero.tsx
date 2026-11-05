'use client';

import { COUPLE_NAMES, INVITATION_PHOTOS, formatWeddingDate } from '@/lib/invitation';

import { useLocale, useTranslation } from '@/locales/i18n-provider';

import { AddToCalendar } from './add-to-calendar';

const delay = (seconds: number) => ({ '--d': `${seconds}s` }) as React.CSSProperties;

/**
 * Photo panel for the personal save-the-date page. Sticky beside the form on large screens.
 * It is drawn by CSS alone, so it shows as soon as the HTML arrives instead of waiting
 * for JavaScript; the beige background covers the instant before the photo paints.
 */
export function InvitationHero({ fullName }: { fullName: string }) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  return (
    <header className="relative h-[78svh] min-h-[32rem] w-full overflow-hidden bg-[#e9dfcf] lg:sticky lg:top-0 lg:h-svh">
      <img
        src={INVITATION_PHOTOS.hero}
        alt=""
        className="inv-photo absolute inset-0 h-full w-full object-cover object-[35%_30%]"
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--inv-ink)] from-0% via-[var(--inv-ink)]/60 via-40% to-transparent to-75%" />
      <div className="absolute inset-x-0 bottom-0 p-6 pb-14 text-[var(--inv-paper)] sm:p-10 sm:pb-16">
        <p
          className="inv-rise font-[family-name:var(--font-invitation)] text-xl italic opacity-90"
          style={delay(0.1)}
        >
          {COUPLE_NAMES}
        </p>
        <div className="inv-rule mt-3 h-px w-16 bg-[var(--inv-gold)]" style={delay(0.3)} />
        <h1
          className="inv-rise mt-4 font-[family-name:var(--font-invitation)] text-5xl font-medium leading-[1.02] text-balance sm:text-6xl"
          style={delay(0.4)}
        >
          {t('invitations.page.greeting', { name: fullName })}
        </h1>
        <p
          className="inv-rise mt-4 font-[family-name:var(--font-invitation)] text-2xl italic"
          style={delay(0.7)}
        >
          {t('invitations.page.invited')}
        </p>
        <p className="inv-rise mt-1 text-base opacity-95 first-letter:uppercase" style={delay(0.9)}>
          {formatWeddingDate(locale)}
        </p>
        <div className="inv-rise mt-5" style={delay(1.1)}>
          <AddToCalendar />
        </div>
      </div>
    </header>
  );
}

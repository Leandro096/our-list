'use client';

import { COUPLE_NAMES } from '@/lib/invitation';

import { useTranslation } from '@/locales/i18n-provider';

/** Shown while the server looks up the guest, before the invitation HTML arrives. */
export function InvitationLoader() {
  const { t } = useTranslation();

  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-svh flex-col items-center justify-center gap-5 bg-[#fdfbf7] px-6 text-[#3b2a1f]"
    >
      <style>{`
        @keyframes inv-loader-line { 0% { transform: scaleX(0); transform-origin: left; } 50% { transform: scaleX(1); transform-origin: left; } 50.01% { transform-origin: right; } 100% { transform: scaleX(0); transform-origin: right; } }
        @keyframes inv-loader-in { from { opacity: 0; } to { opacity: 1; } }
        .inv-loader-name { animation: inv-loader-in 0.8s ease-out both; }
        .inv-loader-line { animation: inv-loader-line 1.8s cubic-bezier(.6,0,.3,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .inv-loader-line { animation: none; } .inv-loader-name { animation: none; } }
      `}</style>
      <p className="inv-loader-name text-balance text-center font-serif text-4xl italic sm:text-5xl">
        {COUPLE_NAMES}
      </p>
      <div className="h-px w-24 overflow-hidden bg-[#e4d9c6]">
        <div className="inv-loader-line h-full w-full bg-[#c9a24b]" />
      </div>
      <p className="text-sm text-[#7a6652]">{t('invitations.page.loading')}</p>
    </main>
  );
}

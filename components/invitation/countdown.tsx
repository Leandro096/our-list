'use client';

import { useState, useEffect } from 'react';

import { ceremonyStart, WEDDING_DATE_ISO } from '@/lib/invitation';

import { useTranslation } from '@/locales/i18n-provider';

const pad = (n: number) => String(n).padStart(2, '0');

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="grid h-20 w-16 place-items-center rounded-xl border border-[var(--gold)]/40 bg-white/5 backdrop-blur-sm [perspective:400px] sm:h-24 sm:w-20">
        <span
          key={value}
          className="px-tick font-[family-name:var(--font-invitation)] text-4xl tabular-nums sm:text-5xl"
        >
          {value}
        </span>
      </div>
      <span className="mt-2 text-sm text-[var(--sand)]/80">{label}</span>
    </div>
  );
}

/** Live countdown to the wedding day (midnight, local time). */
export function Countdown() {
  const { t } = useTranslation();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Counts down to the ceremony; from midnight of the wedding day it says the day has arrived.
  const target = ceremonyStart().getTime();
  const dayStart = new Date(`${WEDDING_DATE_ISO}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  if (now !== null && now >= dayStart) {
    return (
      <p className="font-[family-name:var(--font-script)] text-5xl text-[var(--gold)]">
        {now < dayEnd
          ? t('invitations.page.pass.exp.countToday')
          : t('invitations.page.pass.exp.countAfter')}
      </p>
    );
  }

  const diff = now === null ? 0 : Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const ready = now !== null;

  return (
    <div className="flex justify-center gap-2 sm:gap-4" role="timer" aria-live="off">
      <Unit value={ready ? String(days) : '--'} label={t('invitations.page.pass.exp.days')} />
      <Unit value={ready ? pad(hours) : '--'} label={t('invitations.page.pass.exp.hours')} />
      <Unit value={ready ? pad(minutes) : '--'} label={t('invitations.page.pass.exp.minutes')} />
      <Unit value={ready ? pad(seconds) : '--'} label={t('invitations.page.pass.exp.seconds')} />
    </div>
  );
}

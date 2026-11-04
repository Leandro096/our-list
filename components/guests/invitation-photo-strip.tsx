'use client';

import { PHOTOGRAPHER, INVITATION_PHOTOS } from '@/lib/invitation';

import { useTranslation } from '@/locales/i18n-provider';

import { Reveal } from './reveal';

export function InvitationPhotoStrip() {
  const { t } = useTranslation();

  return (
    <footer className="mx-auto mt-16 w-full max-w-2xl">
      <div className="mb-4 h-px w-12 bg-[var(--inv-gold)]" />
      <div className="grid grid-cols-3 gap-2">
        {INVITATION_PHOTOS.strip.map((src, i) => (
          <Reveal key={src} delay={i * 0.15}>
            <img
              src={src}
              alt=""
              loading="lazy"
              className="aspect-[2/3] w-full rounded-sm object-cover"
            />
          </Reveal>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {t('invitations.page.photoCredit')}{' '}
        <a
          href={PHOTOGRAPHER.url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="text-foreground underline decoration-[var(--inv-gold)] underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {PHOTOGRAPHER.handle}
        </a>
      </p>
    </footer>
  );
}

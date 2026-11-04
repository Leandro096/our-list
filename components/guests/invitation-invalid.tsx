'use client';

import { COUPLE_NAMES } from '@/lib/invitation';

import { useTranslation } from '@/locales/i18n-provider';

export function InvitationInvalid() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
      <p className="font-[family-name:var(--font-invitation)] text-xl italic">{COUPLE_NAMES}</p>
      <h1 className="mt-3 font-[family-name:var(--font-invitation)] text-4xl font-medium">
        {t('invitations.page.invalidTitle')}
      </h1>
      <p className="mt-3 text-muted-foreground">{t('invitations.page.invalidBody')}</p>
    </main>
  );
}

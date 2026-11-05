'use client';

import { formatWeddingDate } from '@/lib/invitation';

import { useLocale, useTranslation } from '@/locales/i18n-provider';

/** Lets server-rendered pages show translated text without turning the whole page into a client component. */
export function I18nText({ k }: { k: string }) {
  const { t } = useTranslation();
  return <>{(t as (key: string) => string)(k)}</>;
}

export function DateText() {
  const { locale } = useLocale();
  return <>{formatWeddingDate(locale)}</>;
}

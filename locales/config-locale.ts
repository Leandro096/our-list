import type { Locale } from '@/lib/types';

export const LOCALES: { value: Locale; label: string; native: string; flag: string }[] = [
  { value: 'es', label: 'Spanish', native: 'Español', flag: 'ES' },
  { value: 'en', label: 'English', native: 'English', flag: 'EN' },
];

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_STORAGE_KEY = 'wedding-locale';

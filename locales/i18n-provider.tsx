'use client';

import * as React from 'react';

import type { Locale } from '@/lib/types';

import { es } from './langs/es';
import { en, type Dictionary } from './langs/en';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './config-locale';

const DICTIONARIES: Record<Locale, Dictionary> = { en, es };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dict: Dictionary;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

function getFromPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

function asLocale(value?: string | null): Locale | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('en')) return 'en';
  return null;
}

function getBrowserPreferredLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null;
  const candidates =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const candidate of candidates) {
    const parsed = asLocale(candidate);
    if (parsed) return parsed;
  }
  return null;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (stored === 'en' || stored === 'es') {
        document.cookie = `${LOCALE_STORAGE_KEY}=${stored}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        const browserLocale = getBrowserPreferredLocale();
        if (browserLocale) {
          localStorage.setItem(LOCALE_STORAGE_KEY, browserLocale);
          document.cookie = `${LOCALE_STORAGE_KEY}=${browserLocale}; path=/; max-age=31536000; SameSite=Lax`;
        }
      }
    } catch {}
    const rafId = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {}
    document.cookie = `${LOCALE_STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, []);

  React.useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  const value = React.useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale,
      dict,
      t: (path, vars) => {
        const str = getFromPath(dict, path) ?? getFromPath(en, path) ?? path;
        return interpolate(str, vars);
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Expone solo `t` para traducir textos. */
export function useTranslation() {
  const { t } = useI18n();
  return { t };
}

/** Expone solo el locale activo y su setter. */
export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}

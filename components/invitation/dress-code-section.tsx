'use client';

import { Heart } from 'lucide-react';

import { DRESS_PALETTE } from '@/lib/invitation';

import { useLocale, useTranslation } from '@/locales/i18n-provider';

import { Rv } from './use-in-view';

/** Dress code with a colour palette, followed by a gentle note that the celebration is adults only. */
export function DressCodeSection() {
  const { t } = useTranslation();
  const { locale } = useLocale();

  return (
    <section className="bg-[var(--paper)] px-6 py-24 text-center">
      <div className="mx-auto max-w-xl">
        <Rv variant="zoom">
          <h2 className="font-[family-name:var(--font-invitation)] text-4xl font-medium sm:text-5xl">
            {t('invitations.page.pass.exp.dressCode')}
          </h2>
        </Rv>
        <Rv variant="rise" delay={0.1}>
          <p className="mt-3 font-[family-name:var(--font-script)] text-4xl text-[var(--khaki)]">
            {t('invitations.page.pass.exp.dressStyle')}
          </p>
        </Rv>
        <Rv variant="rise" delay={0.15}>
          <p className="mx-auto mt-4 max-w-md font-[family-name:var(--font-invitation)] text-xl leading-relaxed text-[var(--ink)]/90 sm:text-2xl">
            {t('invitations.page.pass.exp.dressBody')}
          </p>
        </Rv>

        <ul className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-6">
          {DRESS_PALETTE.map((color, i) => {
            const name = locale === 'es' ? color.es : color.en;
            return (
              <li key={color.hex}>
                <Rv variant="zoom" delay={0.1 + i * 0.12}>
                  <div className="group flex flex-col items-center gap-3">
                    <span
                      className="size-16 rounded-full border border-black/10 shadow-[inset_0_2px_6px_rgba(255,255,255,.4),0_8px_18px_-8px_rgba(59,42,31,.5)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:scale-110"
                      style={{ backgroundColor: color.hex }}
                      role="img"
                      aria-label={name}
                    />
                    <span className="text-sm text-[var(--muted-foreground)]">{name}</span>
                  </div>
                </Rv>
              </li>
            );
          })}
        </ul>

        <Rv variant="rise" delay={0.1} className="mt-20">
          <div className="rounded-3xl border border-[var(--border)] bg-white px-7 py-9">
            <Heart aria-hidden className="mx-auto size-6 fill-[#d8b4a4] stroke-[#c9927a]" />
            <h3 className="mt-4 font-[family-name:var(--font-script)] text-4xl text-[var(--ink)]">
              {t('invitations.page.pass.exp.kidsTitle')}
            </h3>
            <p className="mx-auto mt-3 max-w-md font-[family-name:var(--font-invitation)] text-xl leading-relaxed text-[var(--ink)]/90">
              {t('invitations.page.pass.exp.kidsBody')}
            </p>
          </div>
        </Rv>
      </div>
    </section>
  );
}

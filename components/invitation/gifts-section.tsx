'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { Copy, Check, Landmark, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';

import { useTranslation } from '@/locales/i18n-provider';

import { Rv } from './use-in-view';

export interface PublicBankAccount {
  id: string;
  bank: string;
  account_type: 'savings' | 'checking';
  currency: 'DOP' | 'USD' | 'EUR';
  holder_name: string;
  account_number: string;
  holder_id: string;
}

export interface PublicGiftLink {
  id: string;
  store: string;
  title: string;
  url: string;
}

/** The dialog renders in a portal outside the themed page root, so it needs the theme handed in. */
export interface PortalTheme {
  className: string;
  style: CSSProperties;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function GiftsSection({
  accounts,
  links,
  portalTheme,
}: {
  accounts: PublicBankAccount[];
  links: PublicGiftLink[];
  portalTheme: PortalTheme;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (accounts.length === 0 && links.length === 0) return null;

  return (
    <section className="bg-[var(--sand)] px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <Rv variant="zoom">
          <h2 className="font-[family-name:var(--font-script)] text-5xl text-[var(--ink)] sm:text-6xl">
            {t('invitations.page.pass.exp.giftsTitle')}
          </h2>
        </Rv>
        <Rv variant="rise" delay={0.1}>
          <p className="mx-auto mt-6 max-w-lg font-[family-name:var(--font-invitation)] text-xl leading-relaxed text-[var(--ink)]/90 sm:text-2xl">
            {t('invitations.page.pass.exp.giftsBody')}
          </p>
        </Rv>

        {links.length > 0 && (
          <ul className="mt-10 grid gap-4 text-left sm:grid-cols-2">
            {links.map((link, i) => (
              <li key={link.id}>
                <Rv variant="zoom" delay={0.1 + i * 0.12}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold)] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
                  >
                    <span>
                      <span className="block text-sm text-[var(--khaki)]">{link.store}</span>
                      <span className="mt-1 block font-[family-name:var(--font-invitation)] text-2xl font-medium">
                        {link.title}
                      </span>
                      <span className="sr-only">{t('invitations.page.pass.exp.openStore')}</span>
                    </span>
                    <ExternalLink
                      aria-hidden
                      className="size-5 shrink-0 text-[var(--gold)] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                    />
                  </a>
                </Rv>
              </li>
            ))}
          </ul>
        )}

        {accounts.length > 0 && (
          <Rv variant="rise" delay={0.2} className="mt-10">
            <Button
              size="lg"
              onClick={() => setOpen(true)}
              className="h-12 rounded-full bg-[var(--ink)] px-8 text-base text-[var(--paper)] hover:bg-[var(--ink)]/90"
            >
              <Landmark />
              {t('invitations.page.pass.exp.viewAccounts')}
            </Button>
          </Rv>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={portalTheme.style}
          className={`${portalTheme.className} max-h-[88svh] overflow-y-auto border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] sm:max-w-md`}
        >
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-invitation)] text-3xl font-medium">
              {t('invitations.page.pass.exp.accountsTitle')}
            </DialogTitle>
            <DialogDescription className="text-[var(--muted-foreground)]">
              {t('invitations.page.pass.exp.accountsHint')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {groupByHolder(accounts).map((group) => (
              <HolderCard key={group.key} accounts={group.items} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Accounts that share an ID number belong to the same person, so they are shown together. */
function groupByHolder(accounts: PublicBankAccount[]) {
  const groups = new Map<string, PublicBankAccount[]>();
  for (const account of accounts) {
    const key = account.holder_id.replace(/[^0-9a-z]/gi, '').toLowerCase() || account.id;
    groups.set(key, [...(groups.get(key) ?? []), account]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
}

function HolderCard({ accounts }: { accounts: PublicBankAccount[] }) {
  const { t } = useTranslation();
  const [first] = accounts;
  const currencyLabel = {
    DOP: t('invitations.page.pass.exp.currencyDOP'),
    USD: t('invitations.page.pass.exp.currencyUSD'),
    EUR: t('invitations.page.pass.exp.currencyEUR'),
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5 text-left">
      <h3 className="font-[family-name:var(--font-invitation)] text-2xl font-medium">
        {first.holder_name}
      </h3>
      <div className="mt-3">
        <CopyRow label={t('invitations.page.pass.exp.holderId')} value={first.holder_id} />
      </div>
      <ul className="mt-4 space-y-4">
        {accounts.map((account) => (
          <li key={account.id} className="border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-[family-name:var(--font-invitation)] text-xl font-medium">
                {account.bank}
              </p>
              <p className="text-sm text-[var(--khaki)]">
                {account.account_type === 'checking'
                  ? t('invitations.page.pass.exp.checking')
                  : t('invitations.page.pass.exp.savings')}
                {' · '}
                {currencyLabel[account.currency] ?? account.currency}
              </p>
            </div>
            <div className="mt-2">
              <CopyRow
                label={t('invitations.page.pass.exp.accountNumber')}
                value={account.account_number}
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => setCopied(await copyToClipboard(value))}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 px-4 py-3 text-left transition-colors hover:border-[#c9a24b] hover:bg-[#c9a24b]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]"
    >
      <span>
        <span className="block text-xs text-[var(--muted-foreground)]">{label}</span>
        <span className="block text-lg tabular-nums tracking-wide">{value}</span>
      </span>
      <span
        aria-live="polite"
        className={`flex shrink-0 items-center gap-1 text-sm ${copied ? 'text-[#8a6a22]' : 'text-[var(--muted-foreground)]'}`}
      >
        {copied ? (
          <>
            <Check className="size-4" />
            {t('invitations.page.pass.exp.copied')}
          </>
        ) : (
          <>
            <Copy className="size-4" />
            <span className="sr-only">{t('invitations.page.pass.exp.copy')}</span>
          </>
        )}
      </span>
    </button>
  );
}

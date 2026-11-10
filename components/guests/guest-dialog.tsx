'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Mail, Phone, Armchair, ScanLine, StickyNote, UtensilsCrossed } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { phoneHref, formatPhone } from '@/lib/phone';

import { toast } from '@/hooks';
import { getGuestDialogDataAction } from '@/app/dashboard/guests/actions';

import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogTitle, DialogContent, DialogDescription } from '@/components/ui/dialog';

import { useLocale, useTranslation } from '@/locales/i18n-provider';

import { GuestForm } from './guest-form';
import { QRCodeDisplay } from './qr-code-display';
import { InvitationActions } from './invitation-actions';

type DialogData = Awaited<ReturnType<typeof getGuestDialogDataAction>>;
type Tab = 'summary' | 'edit' | 'saveTheDate' | 'qr';

const TABS: Tab[] = ['summary', 'edit', 'saveTheDate', 'qr'];

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-chart-5',
  confirmed: 'bg-chart-1',
  declined: 'border border-chart-4 bg-transparent',
  tentative: 'bg-chart-2',
};

/**
 * One dialog for creating, viewing and editing a guest.
 * Its state lives in the URL (?guest=new | ?guest=<id>&tab=edit) so links and the back button work.
 */
export function GuestDialog({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guestParam = searchParams.get('guest');
  const tabParam = searchParams.get('tab');

  function setParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'summary';

  return (
    <Dialog
      open={!!guestParam}
      onOpenChange={(open) => {
        if (!open) setParams({ guest: null, tab: null });
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {guestParam === 'new' && (
          <NewGuest categories={categories} onClose={() => setParams({ guest: null, tab: null })} />
        )}
        {guestParam && guestParam !== 'new' && (
          <ExistingGuest
            key={guestParam}
            id={guestParam}
            tab={tab}
            onTab={(next) => setParams({ tab: next === 'summary' ? null : next })}
            onOpenGuest={(id) => setParams({ guest: id, tab: null })}
            onClose={() => setParams({ guest: null, tab: null })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewGuest({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <div className="border-b border-border px-6 pb-4 pt-6">
        <DialogTitle className="font-serif text-2xl">{t('guests.newGuest')}</DialogTitle>
        <DialogDescription className="mt-1">{t('guests.newDescription')}</DialogDescription>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-5">
        <GuestForm
          key={formKey}
          categories={categories}
          onCancel={onClose}
          onDone={(_, addAnother) => {
            toast({ title: t('guestDialog.created') });
            if (addAnother) setFormKey((k) => k + 1);
            else onClose();
          }}
        />
      </div>
    </>
  );
}

function ExistingGuest({
  id,
  tab,
  onTab,
  onOpenGuest,
  onClose,
}: {
  id: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onOpenGuest: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<DialogData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGuestDialogDataAction(id)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const guest = data?.detail;

  if (failed || (data && !guest)) {
    return (
      <div className="space-y-2 px-6 py-10">
        <DialogTitle className="font-serif text-2xl">{t('guests.title')}</DialogTitle>
        <DialogDescription>
          {failed ? t('guestDialog.loadError') : t('guestDialog.notFound')}
        </DialogDescription>
      </div>
    );
  }

  if (!data || !guest) {
    return (
      <div className="flex h-72 items-center justify-center">
        <DialogTitle className="sr-only">{t('guests.title')}</DialogTitle>
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="px-6 pt-6">
        <div className="flex items-baseline gap-3">
          <DialogTitle className="font-serif text-3xl leading-tight">
            {guest.first_name} {guest.last_name}
          </DialogTitle>
          {guest.is_plus_one && (
            <span className="text-sm text-muted-foreground">{t('guests.plusOne')}</span>
          )}
        </div>
        <DialogDescription asChild>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span
              aria-hidden
              className={cn('h-2 w-2 rounded-full', STATUS_DOT[guest.status] ?? 'bg-border')}
            />
            {t(`guests.statuses.${guest.status}`)}
          </p>
        </DialogDescription>

        <div
          role="tablist"
          className="mt-4 flex gap-5 overflow-x-auto overflow-y-hidden border-b border-border"
        >
          {TABS.map((key) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => onTab(key)}
              className={cn(
                'relative -mb-px whitespace-nowrap border-b-2 border-transparent px-0.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                tab === key
                  ? 'border-gold font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(`guestDialog.${key === 'qr' ? 'entryQr' : key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto px-6 pt-5', tab !== 'edit' && 'pb-6')}>
        {tab === 'summary' && <Summary guest={guest} onOpenGuest={onOpenGuest} />}
        {tab === 'edit' && data.edit && (
          <GuestForm
            categories={data.categories}
            guest={data.edit}
            mode="edit"
            onCancel={() => onTab('summary')}
            onDone={() => {
              toast({ title: t('guestDialog.saved') });
              setVersion((v) => v + 1);
              onTab('summary');
            }}
          />
        )}
        {tab === 'saveTheDate' && <SaveTheDate guest={guest} />}
        {tab === 'qr' && <QRCodeDisplay guest={guest} helpText={t('guestDialog.qrHelp')} />}
      </div>
    </>
  );
}

function Row({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function attendanceLabel(value: boolean | null | undefined, t: (k: string) => string) {
  if (value === true) return t('guests.attending');
  if (value === false) return t('guests.notAttending');
  return t('guests.awaitingResponse');
}

function Summary({
  guest,
  onOpenGuest,
}: {
  guest: NonNullable<DialogData['detail']>;
  onOpenGuest: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'es' ? esLocale : undefined;
  const seat = guest.seating_assignments?.[0]?.tables?.number;
  const attendance = (type: string) =>
    guest.event_attendance?.find((ea) => ea.event_type === type)?.attending;

  const relatives = [
    ...(guest.parent ? [guest.parent] : []),
    ...(guest.children ?? []),
    ...(guest.siblings ?? []),
  ];

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {guest.email && (
          <Row icon={Mail}>
            <a href={`mailto:${guest.email}`} className="hover:underline">
              {guest.email}
            </a>
          </Row>
        )}
        {guest.phone && (
          <Row icon={Phone}>
            <a href={phoneHref(guest.phone) ?? `tel:${guest.phone}`} className="hover:underline">
              {formatPhone(guest.phone) || guest.phone}
            </a>
          </Row>
        )}
        <Row icon={Armchair}>
          {seat ? t('scanner.tableNumber', { number: seat }) : t('guestDialog.noSeat')}
        </Row>
        {guest.dietary_restrictions && (
          <Row icon={UtensilsCrossed}>{guest.dietary_restrictions}</Row>
        )}
        {guest.notes && <Row icon={StickyNote}>{guest.notes}</Row>}
      </section>

      <section className="space-y-2">
        <h3 className="font-serif text-lg">{t('guestDialog.attendance')}</h3>
        <dl className="divide-y divide-border border-y border-border text-sm">
          {(['ceremony', 'reception'] as const).map((type) => (
            <div key={type} className="flex justify-between py-2">
              <dt>{t(`scanner.${type}`)}</dt>
              <dd className="text-muted-foreground">{attendanceLabel(attendance(type), t)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {guest.guest_categories.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {guest.guest_categories.map((gc) => (
            <span
              key={gc.category_id}
              className="rounded-full border px-2.5 py-0.5 text-xs"
              style={{ borderColor: gc.categories.color, color: gc.categories.color }}
            >
              {gc.categories.name}
            </span>
          ))}
        </section>
      )}

      {relatives.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-serif text-lg">{t('guests.related')}</h3>
          <ul className="divide-y divide-border border-y border-border">
            {relatives.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => onOpenGuest(person.id)}
                  className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary"
                >
                  <span>
                    {person.first_name} {person.last_name}
                    {person.is_plus_one && (
                      <span className="ml-1 text-xs text-muted-foreground">+1</span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span
                      aria-hidden
                      className={cn(
                        'h-2 w-2 rounded-full',
                        STATUS_DOT[person.status] ?? 'bg-border'
                      )}
                    />
                    {t(`guests.statuses.${person.status}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {guest.scan_logs.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-serif text-lg">{t('guests.checkInHistory')}</h3>
          <ul className="divide-y divide-border border-y border-border text-sm">
            {guest.scan_logs.map((scan) => (
              <li key={scan.id} className="flex items-center justify-between gap-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <ScanLine
                    className={cn('h-4 w-4', scan.is_duplicate ? 'text-destructive' : 'text-sage')}
                  />
                  {t(`scanner.${scan.event_type === 'ceremony' ? 'ceremony' : 'reception'}`)}
                  {scan.is_duplicate && ` (${t('dashboard.duplicate')})`}
                </span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(scan.scanned_at), {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SaveTheDate({ guest }: { guest: NonNullable<DialogData['detail']> }) {
  const { t } = useTranslation();

  if (!guest.short_code || guest.parent) {
    return <p className="py-6 text-muted-foreground">{t('guestDialog.noLink')}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-sm text-muted-foreground">/i/{guest.short_code}</p>
      <InvitationActions
        guest={{
          id: guest.id,
          first_name: guest.first_name,
          phone: guest.phone,
          short_code: guest.short_code,
          invitation_sent_at: guest.invitation_sent_at ?? null,
          members: (guest.children ?? []).map((child) => child.first_name),
        }}
      />
    </div>
  );
}

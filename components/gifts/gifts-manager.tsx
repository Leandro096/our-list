'use client';

import { useState, useTransition } from 'react';
import { Plus, Gift, Pencil, Trash2, Landmark, TriangleAlert } from 'lucide-react';

import { toast } from '@/hooks';
import { useTranslation } from '@/locales';
import {
  saveGiftLinkAction,
  type GiftLinkInput,
  deleteGiftLinkAction,
  saveBankAccountAction,
  type GiftActionResult,
  type BankAccountInput,
  deleteBankAccountAction,
} from '@/app/dashboard/gifts/actions';

import {
  Card,
  Input,
  Label,
  Button,
  Dialog,
  Select,
  CardTitle,
  SelectItem,
  CardHeader,
  DialogTitle,
  CardContent,
  SelectValue,
  DialogHeader,
  SelectContent,
  DialogContent,
  SelectTrigger,
  DialogDescription,
} from '@/components/ui';

export interface BankAccountRow {
  id: string;
  bank: string;
  account_type: 'savings' | 'checking';
  currency: 'DOP' | 'USD' | 'EUR';
  holder_name: string;
  account_number: string;
  holder_id: string;
}

export interface GiftLinkRow {
  id: string;
  store: string;
  title: string;
  url: string;
}

const emptyAccount: BankAccountInput = {
  bank: '',
  account_type: 'savings',
  currency: 'DOP',
  holder_name: '',
  account_number: '',
  holder_id: '',
};
const emptyLink: GiftLinkInput = { store: '', title: '', url: '' };

export function GiftsManager({
  accounts,
  links,
  missingTables,
}: {
  accounts: BankAccountRow[];
  links: GiftLinkRow[];
  missingTables: boolean;
}) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [accountForm, setAccountForm] = useState<BankAccountInput | null>(null);
  const [linkForm, setLinkForm] = useState<GiftLinkInput | null>(null);

  const run = (action: () => Promise<GiftActionResult>, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({ title: t('gifts.saved') });
        onDone?.();
      } else {
        toast({
          title: t('common.error'),
          description: t(
            'error' in result && result.error === 'invalid' ? 'gifts.invalid' : 'gifts.saveFailed'
          ),
          variant: 'destructive',
        });
      }
    });

  const accountTypeLabel = (type: string) =>
    type === 'checking' ? t('gifts.checking') : t('gifts.savings');

  return (
    <div className="space-y-10">
      {missingTables && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{t('gifts.missingTables')}</p>
        </div>
      )}

      {/* ---- Bank accounts ---- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <Landmark className="size-5" />
            {t('gifts.accounts')}
          </h2>
          <Button onClick={() => setAccountForm(emptyAccount)}>
            <Plus />
            {t('gifts.addAccount')}
          </Button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-muted-foreground">{t('gifts.noAccounts')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((a) => (
              <Card key={a.id} className="gap-3">
                <CardHeader className="gap-0">
                  <CardTitle className="font-serif text-lg">
                    {a.bank} · {accountTypeLabel(a.account_type)} · {a.currency}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{a.holder_name}</p>
                  <p className="text-muted-foreground">
                    {t('gifts.accountNumber')}: {a.account_number}
                  </p>
                  <p className="text-muted-foreground">
                    {t('gifts.holderId')}: {a.holder_id}
                  </p>
                  <div className="flex gap-2 pt-3">
                    <Button variant="outline" size="sm" onClick={() => setAccountForm({ ...a })}>
                      <Pencil />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(t('gifts.confirmDelete'))) {
                          run(() => deleteBankAccountAction(a.id));
                        }
                      }}
                    >
                      <Trash2 />
                      {t('common.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ---- Gift links ---- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <Gift className="size-5" />
            {t('gifts.links')}
          </h2>
          <Button onClick={() => setLinkForm(emptyLink)}>
            <Plus />
            {t('gifts.addLink')}
          </Button>
        </div>
        {links.length === 0 ? (
          <p className="text-muted-foreground">{t('gifts.noLinks')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((l) => (
              <Card key={l.id} className="gap-3">
                <CardHeader className="gap-0">
                  <CardTitle className="font-serif text-lg">{l.store}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{l.title}</p>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-muted-foreground underline underline-offset-4"
                  >
                    {l.url}
                  </a>
                  <div className="flex gap-2 pt-3">
                    <Button variant="outline" size="sm" onClick={() => setLinkForm({ ...l })}>
                      <Pencil />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(t('gifts.confirmDelete'))) {
                          run(() => deleteGiftLinkAction(l.id));
                        }
                      }}
                    >
                      <Trash2 />
                      {t('common.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ---- Account dialog ---- */}
      <Dialog open={accountForm !== null} onOpenChange={(o) => !o && setAccountForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accountForm?.id ? t('gifts.editAccount') : t('gifts.addAccount')}
            </DialogTitle>
            <DialogDescription className="sr-only">{t('gifts.accounts')}</DialogDescription>
          </DialogHeader>
          {accountForm && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => saveBankAccountAction(accountForm),
                  () => setAccountForm(null)
                );
              }}
            >
              <Field label={t('gifts.bank')}>
                <Input
                  required
                  maxLength={80}
                  value={accountForm.bank}
                  onChange={(e) => setAccountForm({ ...accountForm, bank: e.target.value })}
                />
              </Field>
              <Field label={t('gifts.accountType')}>
                <Select
                  value={accountForm.account_type}
                  onValueChange={(v) =>
                    setAccountForm({ ...accountForm, account_type: v as 'savings' | 'checking' })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">{t('gifts.savings')}</SelectItem>
                    <SelectItem value="checking">{t('gifts.checking')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('gifts.currency')}>
                <Select
                  value={accountForm.currency}
                  onValueChange={(v) =>
                    setAccountForm({ ...accountForm, currency: v as 'DOP' | 'USD' | 'EUR' })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOP">{t('gifts.currencyDOP')}</SelectItem>
                    <SelectItem value="USD">{t('gifts.currencyUSD')}</SelectItem>
                    <SelectItem value="EUR">{t('gifts.currencyEUR')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('gifts.holderName')}>
                <Input
                  required
                  maxLength={120}
                  value={accountForm.holder_name}
                  onChange={(e) => setAccountForm({ ...accountForm, holder_name: e.target.value })}
                />
              </Field>
              <Field label={t('gifts.accountNumber')}>
                <Input
                  required
                  inputMode="numeric"
                  maxLength={40}
                  value={accountForm.account_number}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, account_number: e.target.value })
                  }
                />
              </Field>
              <Field label={t('gifts.holderId')}>
                <Input
                  required
                  maxLength={40}
                  value={accountForm.holder_id}
                  onChange={(e) => setAccountForm({ ...accountForm, holder_id: e.target.value })}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={pending}>
                {t('common.save')}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Link dialog ---- */}
      <Dialog open={linkForm !== null} onOpenChange={(o) => !o && setLinkForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{linkForm?.id ? t('gifts.editLink') : t('gifts.addLink')}</DialogTitle>
            <DialogDescription className="sr-only">{t('gifts.links')}</DialogDescription>
          </DialogHeader>
          {linkForm && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => saveGiftLinkAction(linkForm),
                  () => setLinkForm(null)
                );
              }}
            >
              <Field label={t('gifts.store')}>
                <Input
                  required
                  maxLength={80}
                  placeholder="Amazon, Walmart…"
                  value={linkForm.store}
                  onChange={(e) => setLinkForm({ ...linkForm, store: e.target.value })}
                />
              </Field>
              <Field label={t('gifts.linkTitle')}>
                <Input
                  required
                  maxLength={120}
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                />
              </Field>
              <Field label={t('gifts.url')}>
                <Input
                  required
                  type="url"
                  maxLength={500}
                  placeholder="https://"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={pending}>
                {t('common.save')}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

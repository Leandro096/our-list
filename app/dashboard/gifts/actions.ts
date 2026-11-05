'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { mutationLimiter } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, ForbiddenError, UnauthorizedError } from '@/lib/server-auth';

export type BankAccountInput = {
  id?: string;
  bank: string;
  account_type: 'savings' | 'checking';
  currency: 'DOP' | 'USD' | 'EUR';
  holder_name: string;
  account_number: string;
  holder_id: string;
};

export type GiftLinkInput = {
  id?: string;
  store: string;
  title: string;
  url: string;
};

export type GiftActionResult = { ok: true } | { ok: false; error: string };

async function authorize(): Promise<
  { ok: true; supabase: Awaited<ReturnType<typeof createClient>> } | { ok: false; error: string }
> {
  const supabase = await createClient();
  try {
    const { userId } = await requireAuth(supabase, PERMISSIONS.GUESTS_EDIT);
    if (!mutationLimiter.check(userId).allowed) return { ok: false, error: 'rate_limited' };
    return { ok: true, supabase };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: 'unauthorized' };
    if (err instanceof ForbiddenError) return { ok: false, error: 'forbidden' };
    return { ok: false, error: 'unknown' };
  }
}

const clean = (value: string, max: number) => value.trim().slice(0, max);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function saveBankAccountAction(input: BankAccountInput): Promise<GiftActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;

  const row = {
    bank: clean(input.bank, 80),
    account_type: input.account_type === 'checking' ? 'checking' : 'savings',
    holder_name: clean(input.holder_name, 120),
    account_number: clean(input.account_number, 40),
    currency: ['USD', 'EUR'].includes(input.currency) ? input.currency : 'DOP',
    holder_id: clean(input.holder_id, 40),
  };
  if (!row.bank || !row.holder_name || !row.account_number || !row.holder_id) {
    return { ok: false, error: 'invalid' };
  }

  const query = input.id
    ? auth.supabase.from('bank_accounts').update(row).eq('id', input.id)
    : auth.supabase.from('bank_accounts').insert(row);
  const { error } = await query;
  if (error) return { ok: false, error: 'save_failed' };

  revalidatePath('/dashboard/gifts');
  return { ok: true };
}

export async function deleteBankAccountAction(id: string): Promise<GiftActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const { error } = await auth.supabase.from('bank_accounts').delete().eq('id', id);
  if (error) return { ok: false, error: 'save_failed' };
  revalidatePath('/dashboard/gifts');
  return { ok: true };
}

export async function saveGiftLinkAction(input: GiftLinkInput): Promise<GiftActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;

  const row = {
    store: clean(input.store, 80),
    title: clean(input.title, 120),
    url: clean(input.url, 500),
  };
  if (!row.store || !row.title || !isHttpUrl(row.url)) return { ok: false, error: 'invalid' };

  const query = input.id
    ? auth.supabase.from('gift_links').update(row).eq('id', input.id)
    : auth.supabase.from('gift_links').insert(row);
  const { error } = await query;
  if (error) return { ok: false, error: 'save_failed' };

  revalidatePath('/dashboard/gifts');
  return { ok: true };
}

export async function deleteGiftLinkAction(id: string): Promise<GiftActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const { error } = await auth.supabase.from('gift_links').delete().eq('id', id);
  if (error) return { ok: false, error: 'save_failed' };
  revalidatePath('/dashboard/gifts');
  return { ok: true };
}

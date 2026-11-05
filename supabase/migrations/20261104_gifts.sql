-- Gift registry shown on the guest invitation page (/invitacion/<code>).
-- Run once in the Supabase SQL editor.
--
-- The public page reads these tables on the server with the service role key, so no public
-- policy is needed. Signed-in staff manage them from /dashboard/gifts.

create table if not exists public.bank_accounts (
  id             uuid primary key default gen_random_uuid(),
  bank           text not null check (char_length(bank) between 1 and 80),
  account_type   text not null check (account_type in ('savings', 'checking')),
  holder_name    text not null check (char_length(holder_name) between 1 and 120),
  account_number text not null check (char_length(account_number) between 1 and 40),
  currency       text not null default 'DOP' check (currency in ('DOP', 'USD', 'EUR')),
  holder_id      text not null check (char_length(holder_id) between 1 and 40),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.gift_links (
  id         uuid primary key default gen_random_uuid(),
  store      text not null check (char_length(store) between 1 and 80),
  title      text not null check (char_length(title) between 1 and 120),
  url        text not null check (url ~* '^https?://' and char_length(url) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- For databases where bank_accounts already exists without a currency.
alter table public.bank_accounts
  add column if not exists currency text not null default 'DOP' check (currency in ('DOP', 'USD', 'EUR'));

alter table public.bank_accounts enable row level security;
alter table public.gift_links enable row level security;

drop policy if exists "staff manage bank_accounts" on public.bank_accounts;
create policy "staff manage bank_accounts" on public.bank_accounts
  for all to authenticated using (true) with check (true);

drop policy if exists "staff manage gift_links" on public.gift_links;
create policy "staff manage gift_links" on public.gift_links
  for all to authenticated using (true) with check (true);

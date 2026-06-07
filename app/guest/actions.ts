'use server';

import { createClient } from '@/lib/supabase/server';

import { getGuestById } from '@/services';

export async function fetchGuestById(id: string) {
  const supabase = await createClient();
  const guest = await getGuestById(supabase, id);
  return guest;
}

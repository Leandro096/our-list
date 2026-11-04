'use server';

import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/lib/permissions';
import { mutationLimiter } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, ForbiddenError, UnauthorizedError } from '@/lib/server-auth';

export async function markInvitationSentAction(
  guestId: string,
  sent: boolean
): Promise<{ ok: true; sentAt: string | null } | { ok: false; error: string }> {
  const supabase = await createClient();

  let userId: string;
  try {
    ({ userId } = await requireAuth(supabase, PERMISSIONS.GUESTS_EDIT));
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: 'unauthorized' };
    if (err instanceof ForbiddenError) return { ok: false, error: 'forbidden' };
    return { ok: false, error: 'unknown' };
  }

  if (!mutationLimiter.check(userId).allowed) return { ok: false, error: 'rate_limited' };

  const sentAt = sent ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('guests')
    .update({ invitation_sent_at: sentAt })
    .eq('id', guestId);

  if (error) return { ok: false, error: 'save_failed' };

  revalidatePath('/dashboard/invitations');
  return { ok: true, sentAt };
}

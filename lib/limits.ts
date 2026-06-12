import type { SupabaseClient } from '@supabase/supabase-js';

export class LimitError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'GUEST_QUOTA'
      | 'EVENT_QUOTA'
      | 'MEMBER_QUOTA'
      | 'DATE_CHANGE_QUOTA'
      | 'EVENT_LOCKED'
  ) {
    super(message);
    this.name = 'LimitError';
  }
}

type PlanLimits = {
  max_events: number;
  max_guests_per_event: number;
  max_members: number;
  max_free_date_changes: number;
};

type SubscriptionRow = {
  plans: PlanLimits | null;
};

async function getPlanLimits(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PlanLimits | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plans(max_events, max_guests_per_event, max_members, max_free_date_changes)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return (data as unknown as SubscriptionRow | null)?.plans ?? null;
}

/**
 * Assert the tenant hasn't reached their max_events limit.
 * Call before creating a new event.
 */
export async function assertCanCreateEvent(
  supabase: SupabaseClient,
  tenantId: string
): Promise<void> {
  const limits = await getPlanLimits(supabase, tenantId);
  if (!limits) throw new LimitError('No active subscription found.', 'EVENT_QUOTA');

  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'archived']);

  if ((count ?? 0) >= limits.max_events) {
    throw new LimitError(
      `Your plan allows a maximum of ${limits.max_events} event(s). Upgrade to create more.`,
      'EVENT_QUOTA'
    );
  }
}

/**
 * Assert the event hasn't reached its max_guests_per_event limit.
 * Call before inserting a new guest.
 */
export async function assertGuestQuota(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single();

  if (!event) throw new LimitError('Event not found.', 'GUEST_QUOTA');

  const limits = await getPlanLimits(supabase, (event as { tenant_id: string }).tenant_id);
  if (!limits) throw new LimitError('No active subscription found.', 'GUEST_QUOTA');

  const { count } = await supabase
    .from('guests')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if ((count ?? 0) >= limits.max_guests_per_event) {
    throw new LimitError(
      `Your plan allows a maximum of ${limits.max_guests_per_event} guests per event. Upgrade to add more.`,
      'GUEST_QUOTA'
    );
  }
}

/**
 * Assert the tenant hasn't reached their max_members (seats) limit.
 * Call before inviting a new tenant member.
 */
export async function assertCanAddMember(
  supabase: SupabaseClient,
  tenantId: string
): Promise<void> {
  const limits = await getPlanLimits(supabase, tenantId);
  if (!limits) throw new LimitError('No active subscription found.', 'MEMBER_QUOTA');

  const { count } = await supabase
    .from('tenant_members')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if ((count ?? 0) >= limits.max_members) {
    throw new LimitError(
      `Your plan allows a maximum of ${limits.max_members} member(s). Upgrade to add more.`,
      'MEMBER_QUOTA'
    );
  }
}

/**
 * Assert the event can still have its date changed for free.
 * Call before updating event_date.
 * Returns the current date_changes_used count.
 */
export async function assertCanChangeEventDate(
  supabase: SupabaseClient,
  eventId: string
): Promise<number> {
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id, date_changes_used')
    .eq('id', eventId)
    .single();

  if (!event) throw new LimitError('Event not found.', 'DATE_CHANGE_QUOTA');

  const e = event as { tenant_id: string; date_changes_used: number };
  const limits = await getPlanLimits(supabase, e.tenant_id);
  if (!limits) throw new LimitError('No active subscription found.', 'DATE_CHANGE_QUOTA');

  if (e.date_changes_used >= limits.max_free_date_changes) {
    throw new LimitError(
      `You have used all ${limits.max_free_date_changes} free date change(s) for this event.`,
      'DATE_CHANGE_QUOTA'
    );
  }

  return e.date_changes_used;
}

/**
 * Assert the event is not locked (is_locked = false) and status is 'active'.
 * Call before any mutation on guests, tables, or seating for this event.
 */
export async function assertEventEditable(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  const { data: event } = await supabase
    .from('events')
    .select('is_locked, status')
    .eq('id', eventId)
    .single();

  if (!event) throw new LimitError('Event not found.', 'EVENT_LOCKED');

  const e = event as { is_locked: boolean; status: string };

  if (e.is_locked) {
    throw new LimitError(
      'This event is locked (the event date has passed). Data is now read-only.',
      'EVENT_LOCKED'
    );
  }

  if (e.status !== 'active') {
    throw new LimitError(
      `This event is ${e.status} and cannot be modified.`,
      'EVENT_LOCKED'
    );
  }
}

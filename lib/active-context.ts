/**
 * Active tenant/event selection persisted in cookies.
 *
 * A user may belong to several tenants and a tenant may own several events.
 * The "active" selection is stored in httpOnly cookies and honoured by the
 * server-side context resolvers (`getActiveContext`, `getInitialProfile`).
 *
 * Server-only: imports `next/headers`. Never import from a client component.
 */
import { cookies } from 'next/headers';

export const ACTIVE_TENANT_COOKIE = 'wl_active_tenant';
export const ACTIVE_EVENT_COOKIE = 'wl_active_event';

/** Request header injected by the proxy (middleware) carrying the resolved subdomain. */
export const SUBDOMAIN_HEADER = 'x-tenant-subdomain';

/** Reads the subdomain injected by the proxy for the current request, if any. */
export async function readRequestSubdomain(): Promise<string | null> {
  const { headers } = await import('next/headers');
  const h = await headers();
  return h.get(SUBDOMAIN_HEADER) || null;
}

/** Reads the request pathname injected by the proxy (`x-pathname`), if available. */
export async function readRequestPathname(): Promise<string | null> {
  const { headers } = await import('next/headers');
  const h = await headers();
  return h.get('x-pathname') || null;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export interface ActiveSelection {
  tenantId?: string;
  eventId?: string;
}

/** Reads the persisted active tenant/event selection from cookies. */
export async function readActiveSelection(): Promise<ActiveSelection> {
  const store = await cookies();
  return {
    tenantId: store.get(ACTIVE_TENANT_COOKIE)?.value || undefined,
    eventId: store.get(ACTIVE_EVENT_COOKIE)?.value || undefined,
  };
}

/** Persists the active tenant. Clears the event so it re-resolves for the new tenant. */
export async function writeActiveTenant(tenantId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });
  store.delete(ACTIVE_EVENT_COOKIE);
}

/** Persists the active event. */
export async function writeActiveEvent(eventId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_EVENT_COOKIE, eventId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });
}

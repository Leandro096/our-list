import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

// Keep in sync with SUBDOMAIN_HEADER in '@/lib/active-context'. Defined locally
// to avoid importing that module (it pulls `next/headers`, unavailable here).
const SUBDOMAIN_HEADER = 'x-tenant-subdomain';

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api']);

/**
 * Extracts the tenant subdomain from the request host, if any.
 * - Production: matches `<sub>.${NEXT_PUBLIC_ROOT_DOMAIN}` (single level only).
 * - Local dev: matches `<sub>.localhost`.
 * Reserved subdomains (www, app, admin, api) and the apex domain return null.
 */
function resolveSubdomain(request: NextRequest): string | null {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  if (!host) return null;

  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    return sub && !sub.includes('.') && !RESERVED_SUBDOMAINS.has(sub) ? sub : null;
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase();
  if (!rootDomain) return null;

  const suffix = `.${rootDomain}`;
  if (!host.endsWith(suffix)) return null;

  const sub = host.slice(0, -suffix.length);
  // Ignore the apex (empty), multi-level subdomains, and reserved names.
  if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export async function updateSession(request: NextRequest) {
  // Strip any client-supplied subdomain header (anti-spoofing) and re-derive it
  // from the trusted host. Downstream server code reads it via headers().
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(SUBDOMAIN_HEADER);
  const subdomain = resolveSubdomain(request);
  if (subdomain) requestHeaders.set(SUBDOMAIN_HEADER, subdomain);

  // Expose the request pathname to server components (layouts can't read it
  // otherwise). Used by the dashboard billing gate to avoid a redirect loop.
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getClaims() to validate the JWT locally using the project's public keys.
  // Faster than getUser() (no network call) and required for token refresh in the proxy.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = data?.claims != null;

  // Protect dashboard routes - redirect to login if not authenticated.
  if (request.nextUrl.pathname.startsWith('/dashboard') && !isAuthenticated) {
    // Server Actions are POST requests identified by the Next-Action header.
    // A 302/307 redirect on a POST causes the browser to replay the POST body
    // to the redirect target, which breaks the action and produces a 307 loop.
    // Return 401 instead so the client can handle it (e.g. show a toast and
    // redirect the user to login without replaying the action payload).
    if (request.headers.has('next-action')) {
      return NextResponse.json(
        { error: 'Su sesión ha expirado. Por favor recargue la página.' },
        { status: 401 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    // Use 302 (not the default 307) so any non-GET method becomes GET on
    // the redirect, preventing POST/PUT bodies from being replayed to /auth/login.
    return NextResponse.redirect(url, 302);
  }

  // Redirect authenticated users away from auth pages.
  // Use a clean URL (no query params) to avoid leaking ?next= into the dashboard.
  if (
    request.nextUrl.pathname.startsWith('/auth') &&
    isAuthenticated &&
    !request.nextUrl.pathname.startsWith('/auth/callback')
  ) {
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url, 302);
  }

  return supabaseResponse;
}

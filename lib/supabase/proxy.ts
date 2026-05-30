import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
            request,
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

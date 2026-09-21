import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !sessionData.user) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  // The public.users row is created by the auth trigger (migration 006); the
  // workspace (tenant + plan) is created explicitly in /onboarding, which the
  // dashboard layout redirects to when the user has no active tenant.
  return NextResponse.redirect(`${origin}${next}`);
}

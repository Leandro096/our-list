import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import type { EmailOtpType } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES: EmailOtpType[] = ['recovery', 'invite', 'signup', 'email', 'magiclink'];

/**
 * Verifies the one-time token from Supabase emails (recovery, invite, ...).
 *
 * Unlike the PKCE `code` flow handled by /auth/callback, this does not depend on
 * a code verifier stored in the requester's browser. That is what makes it work
 * for emails triggered from the server (an admin sending a reset or an invite)
 * and for links opened on a different device.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Only allow same-origin relative paths to avoid open redirects.
  const nextParam = searchParams.get('next');
  const next = nextParam && /^\/(?![/\\])/.test(nextParam) ? nextParam : '/dashboard';

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}

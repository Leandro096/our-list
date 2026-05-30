'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

/**
 * Keeps the Supabase session and the Next.js router fresh, and signs the user
 * out automatically after a period of inactivity.
 *
 * Scenarios handled:
 *
 * 1. **TOKEN_REFRESHED** — Supabase's autoRefreshToken silently mints a new
 *    access token. We call `router.refresh()` so server components receive the
 *    new token from cookies on the next request.
 *
 * 2. **Tab visibility change** — user switches away and comes back after at
 *    least `thresholdMs`. We call `router.refresh()` to re-run server
 *    components with the current cookie. If the tab was hidden for the full
 *    `inactivityLogoutMs`, the logout callback fires instead.
 *
 * 3. **Inactivity logout** — after `inactivityLogoutMs` of no user activity,
 *    `onInactivityTimeout` is called so the caller can sign out and redirect.
 *    Any user interaction (mouse, keyboard, touch) resets the timer.
 *
 * NOTE: This hook intentionally never calls `supabase.auth.getSession()`
 * proactively. That call can trigger `_callRefreshToken()` which, on a stale
 * TCP connection, sets `refreshingPromise` to PENDING indefinitely. Every
 * subsequent DB operation awaits that promise before issuing a fetch, so the
 * request never reaches the network and `withTimeout` kills it after 10 s.
 * autoRefreshToken handles proactive token refresh on its own schedule.
 *
 * @param thresholdMs        Minimum hidden/idle time before a router refresh
 *                           on visibility change (default 2 min).
 * @param inactivityLogoutMs Idle time before `onInactivityTimeout` fires
 *                           (default 30 min).
 * @param onInactivityTimeout Callback invoked when the inactivity limit is
 *                            reached. Typically: signOut() + router.push('/login').
 */
export function useVisibilityRefresh(
  thresholdMs = 120_000,
  inactivityLogoutMs = 30 * 60 * 1000,
  onInactivityTimeout?: () => void | Promise<void>
) {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);

  // Keep the callback ref in sync on every render so the timer closure always
  // calls the latest version without the timer needing to be recreated.
  const onInactivityTimeoutRef = useRef(onInactivityTimeout);
  useEffect(() => {
    onInactivityTimeoutRef.current = onInactivityTimeout;
  });

  useEffect(() => {
    const supabase = createClient();

    // Safe refresh: only reloads the Server Component tree using the existing
    // cookie. Does NOT touch the Supabase JS client or trigger a token refresh.
    function doRefresh() {
      router.refresh();
    }

    // --- 1. TOKEN_REFRESHED: sync server cookies whenever autoRefreshToken fires ---
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
    });

    // --- 2. Tab visibility change ---
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenMs = hiddenAtRef.current !== null ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;

      if (hiddenMs >= inactivityLogoutMs) {
        // Tab was hidden for the full inactivity window — sign out immediately.
        onInactivityTimeoutRef.current?.();
        return;
      }

      if (hiddenMs >= thresholdMs) {
        doRefresh();
      }
    }

    // --- 3. Inactivity logout ---
    let logoutTimer: ReturnType<typeof setTimeout>;

    function resetLogoutTimer() {
      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        onInactivityTimeoutRef.current?.();
      }, inactivityLogoutMs);
    }

    function handleActivity() {
      resetLogoutTimer();
    }

    const activityEvents: string[] = ['mousemove', 'keydown', 'pointerdown', 'touchstart'];
    activityEvents.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetLogoutTimer(); // arrancar el timer desde el momento del mount

    return () => {
      clearTimeout(logoutTimer);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach((e) => document.removeEventListener(e, handleActivity));
    };
  }, [router, thresholdMs, inactivityLogoutMs]);
}

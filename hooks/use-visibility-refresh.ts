'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

/**
 * Keeps the Supabase session and the Next.js router fresh across three scenarios:
 *
 * 1. **TOKEN_REFRESHED** — Supabase's autoRefreshToken silently mints a new
 *    access token in the browser. We call `router.refresh()` immediately so
 *    server components and server actions receive the new token from cookies
 *    on the very next request (avoids the "stale-cookie" hang).
 *
 * 2. **Tab visibility change** — user switches away and comes back after at
 *    least `thresholdMs`. We force-refresh the session and router so any
 *    expired token is replaced before the user clicks anything.
 *
 * 3. **Same-tab idle** — user leaves the page open but doesn't interact.
 *    The browser throttles autoRefreshToken timers aggressively in idle tabs.
 *    After `thresholdMs` of no activity we proactively call `getSession()`
 *    (which triggers a refresh if needed). When the user re-engages after a
 *    long idle period we also call `router.refresh()` to re-run server
 *    components with the fresh token.
 */
export function useVisibilityRefresh(thresholdMs = 120_000) {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const supabase = createClient();

    async function doRefresh() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.refresh();
      }
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

      if (hiddenMs >= thresholdMs) {
        doRefresh();
      }
    }

    // --- 3. Same-tab idle detection ---

    // After `thresholdMs` of no activity: silently keep the session alive
    // so the token is ready when the user next interacts.
    let idleTimer: ReturnType<typeof setTimeout>;

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        supabase.auth.getSession();
      }, thresholdMs);
    }

    function handleActivity() {
      const now = Date.now();
      const idleMs = now - lastActivityRef.current;
      lastActivityRef.current = now;
      resetIdleTimer();

      // User re-engaged after a long idle: refresh server components before
      // they hit a server action with a potentially stale cookie.
      if (idleMs >= thresholdMs) {
        doRefresh();
      }
    }

    const activityEvents: string[] = ['mousemove', 'keydown', 'pointerdown', 'touchstart'];
    activityEvents.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach((e) => document.removeEventListener(e, handleActivity));
    };
  }, [router, thresholdMs]);
}

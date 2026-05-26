'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Refreshes the Supabase session and the Next.js router when the tab becomes
 * visible again after being hidden for at least `thresholdMs` milliseconds
 * (default: 60 seconds).
 *
 * This prevents the "frozen UI" symptom where, after a period of inactivity,
 * navigations appear to hang because the Supabase JWT was in the middle of a
 * silent refresh and the server-component fetch had nothing to wait on.
 */
export function useVisibilityRefresh(thresholdMs = 60_000) {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      // Tab became visible again
      const hiddenDuration =
        hiddenAtRef.current !== null ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;

      if (hiddenDuration < thresholdMs) return;

      // Proactively refresh the session so the next server request has a
      // valid token, then ask Next.js to re-run the current server components.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.refresh();
        }
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router, thresholdMs]);
}

/**
 * Simple in-memory sliding-window rate limiter for Next.js Server Actions.
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 5, windowMs: 10_000 });
 *   const result = limiter.check(userId);
 *   if (!result.allowed) throw new Error(result.message);
 *
 * NOTE: This is per-process memory — resets on server restart/redeploy.
 * Suitable for this app's scale. Swap for a Redis-based limiter if you need
 * cross-instance consistency in a multi-instance deployment.
 *
 * To prevent unbounded memory growth, stale buckets are evicted at each
 * `check()` call when the number of tracked keys exceeds EVICTION_THRESHOLD.
 */

interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Rolling window duration in milliseconds. */
  windowMs: number;
}

interface CheckResult {
  allowed: boolean;
  /** Human-readable message when the request is rejected. */
  message: string;
  /** Approximate milliseconds until the oldest token expires. */
  retryAfterMs: number;
}

interface Bucket {
  timestamps: number[];
}

// Evict stale entries once the map reaches this size to prevent unbounded growth
// in long-running processes (e.g. local dev server or traditional Node hosting).
const EVICTION_THRESHOLD = 5_000;

function createRateLimiter({ limit, windowMs }: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  function evictStale() {
    if (buckets.size < EVICTION_THRESHOLD) return;
    const cutoff = Date.now() - windowMs;
    for (const [key, bucket] of buckets) {
      if (bucket.timestamps.every((t) => t <= cutoff)) {
        buckets.delete(key);
      }
    }
  }

  function check(key: string): CheckResult {
    evictStale();

    const now = Date.now();
    const cutoff = now - windowMs;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }

    // Evict timestamps outside the window
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= limit) {
      const oldest = bucket.timestamps[0];
      const retryAfterMs = oldest + windowMs - now;
      return {
        allowed: false,
        message: `Demasiadas solicitudes. Inténtalo de nuevo en ${Math.ceil(retryAfterMs / 1000)} segundo(s).`,
        retryAfterMs,
      };
    }

    bucket.timestamps.push(now);
    return { allowed: true, message: '', retryAfterMs: 0 };
  }

  /** Clears all tracked buckets. Useful for tests. */
  function reset() {
    buckets.clear();
  }

  return { check, reset };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters for each concern
// ---------------------------------------------------------------------------

/** Heavy operations: bulk import (1 per 30 s per user). */
export const heavyActionLimiter = createRateLimiter({ limit: 1, windowMs: 30_000 });

/** Standard mutations: delete, update (10 per 15 s per user). */
export const mutationLimiter = createRateLimiter({ limit: 10, windowMs: 15_000 });

/** Read/search operations (30 per 10 s per user). */
export const readLimiter = createRateLimiter({ limit: 30, windowMs: 10_000 });

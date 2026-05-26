/**
 * Simple in-memory sliding-window rate limiter for Next.js Server Actions.
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 5, windowMs: 10_000 });
 *   const result = limiter.check(userId);
 *   if (!result.allowed) throw new Error(result.message);
 *
 * NOTE: This is per-process memory — resets on server restart/redeploy.
 * Suitable for this app's scale. Swap for Redis-based limiter if needed.
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

export function createRateLimiter({ limit, windowMs }: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  function check(key: string): CheckResult {
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

  return { check };
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

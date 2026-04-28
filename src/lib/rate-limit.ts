/**
 * In-memory sliding-window rate limiter for public API routes.
 *
 * Limitation: per-process state. On a multi-instance / edge-function deployment
 * each instance keeps its own buckets, so the effective limit is N * max where
 * N is the instance count. Acceptable for an early-stage public checkout where
 * the goal is "stop a single bad actor on a single connection from hammering
 * us"; upgrade to Upstash/Redis when traffic warrants it.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Unique key — typically `${routeName}:${ip}` */
  key: string;
  /** Max requests within the window */
  max: number;
  /** Window length in milliseconds */
  windowMs: number;
}

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterMs: number; resetAt: number };

export function checkRateLimit({ key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { ok: true, remaining: max - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= max) {
    return { ok: false, retryAfterMs: existing.resetAt - now, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

/** Extract the client IP from a request, with sensible fallbacks. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** Test-only: clear all buckets between tests. */
export function resetRateLimitForTesting(): void {
  buckets.clear();
}

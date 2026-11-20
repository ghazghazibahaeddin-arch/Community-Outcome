// Community OS — Sliding-Window Per-IP Rate Limiter
import { NextRequest } from 'next/server';

interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function getClientIp(req: NextRequest): string {
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - params.windowMs;

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, b] of buckets.entries()) {
      const fresh = b.timestamps.filter((t) => t > windowStart);
      if (fresh.length === 0) {
        buckets.delete(k);
      } else {
        b.timestamps = fresh;
      }
    }
  }

  const bucket = buckets.get(params.key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= params.limit) {
    const oldest = bucket.timestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + params.windowMs - now) / 1000));
    buckets.set(params.key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  bucket.timestamps.push(now);
  buckets.set(params.key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, params.limit - bucket.timestamps.length),
    retryAfterSeconds: 0
  };
}

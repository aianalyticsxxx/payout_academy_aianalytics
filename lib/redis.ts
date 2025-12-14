// ==========================================
// REDIS CLIENT (UPSTASH)
// ==========================================

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis (will be undefined if env vars not set)
export const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Rate limiter for API endpoints
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
      analytics: true,
      prefix: 'payout-academy',
    })
  : null;

// Helper functions
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    // Upstash Redis may return already-parsed object or string depending on config
    // Handle both cases for safety
    if (typeof cached === 'string') {
      return JSON.parse(cached) as T;
    }
    return cached as T;
  } catch (error) {
    console.error('[Redis] Cache get error:', error);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  await redis.del(key);
}

export async function clearCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

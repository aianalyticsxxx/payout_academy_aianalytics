// ==========================================
// RATE LIMITING - COMPREHENSIVE PROTECTION
// ==========================================
// Apply rate limits to all sensitive endpoints

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// ==========================================
// REDIS CLIENT
// ==========================================

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// ==========================================
// RATE LIMIT TIERS
// ==========================================

export type RateLimitTier =
  | 'auth'           // Login/register - strict
  | 'api'            // General API - moderate
  | 'ai'             // AI endpoints - expensive
  | 'financial'      // Payments/bets - strict
  | 'admin'          // Admin actions - moderate
  | 'public';        // Public endpoints - lenient

const RATE_LIMITS: Record<RateLimitTier, { requests: number; window: string }> = {
  auth: { requests: 5, window: '1 m' },        // 5 per minute (brute force protection)
  api: { requests: 60, window: '1 m' },        // 60 per minute (standard)
  ai: { requests: 10, window: '1 m' },         // 10 per minute (expensive operations)
  financial: { requests: 20, window: '1 m' },  // 20 per minute (payments, bets)
  admin: { requests: 100, window: '1 m' },     // 100 per minute (admin operations)
  public: { requests: 120, window: '1 m' },    // 120 per minute (public data)
};

// ==========================================
// RATE LIMITER INSTANCES
// ==========================================

const limiters: Record<RateLimitTier, Ratelimit | null> = {
  auth: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.auth.requests, RATE_LIMITS.auth.window as any),
    analytics: true,
    prefix: 'rl:auth',
  }) : null,

  api: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.api.requests, RATE_LIMITS.api.window as any),
    analytics: true,
    prefix: 'rl:api',
  }) : null,

  ai: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.ai.requests, RATE_LIMITS.ai.window as any),
    analytics: true,
    prefix: 'rl:ai',
  }) : null,

  financial: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.financial.requests, RATE_LIMITS.financial.window as any),
    analytics: true,
    prefix: 'rl:financial',
  }) : null,

  admin: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.admin.requests, RATE_LIMITS.admin.window as any),
    analytics: true,
    prefix: 'rl:admin',
  }) : null,

  public: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.public.requests, RATE_LIMITS.public.window as any),
    analytics: true,
    prefix: 'rl:public',
  }) : null,
};

// ==========================================
// RATE LIMIT HELPER
// ==========================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a request
 * @param identifier - User ID, IP, or other identifier
 * @param tier - Rate limit tier to apply
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'api'
): Promise<RateLimitResult> {
  const limiter = limiters[tier];

  // If Redis not configured, allow all (dev mode)
  if (!limiter) {
    return {
      success: true,
      limit: RATE_LIMITS[tier].requests,
      remaining: RATE_LIMITS[tier].requests,
      reset: Date.now() + 60000,
    };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Get identifier from request (IP or user ID)
 */
export function getIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;

  // Try various headers for IP
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnecting = req.headers.get('cf-connecting-ip');

  const ip = cfConnecting || realIp || forwarded?.split(',')[0] || 'anonymous';
  return `ip:${ip}`;
}

/**
 * Rate limit middleware wrapper for API routes
 */
export async function withRateLimit(
  req: NextRequest,
  tier: RateLimitTier,
  userId?: string
): Promise<NextResponse | null> {
  const identifier = getIdentifier(req, userId);
  const result = await checkRateLimit(identifier, tier);

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null; // Continue processing
}

/**
 * Add rate limit headers to successful responses
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());
  return response;
}

// ==========================================
// ROUTE MAPPING
// ==========================================

/**
 * Determine rate limit tier based on route path
 */
export function getTierForRoute(pathname: string): RateLimitTier {
  // Auth routes - strictest limits
  if (pathname.startsWith('/api/auth')) return 'auth';

  // Financial routes - strict limits
  if (
    pathname.startsWith('/api/bets') ||
    pathname.startsWith('/api/parlays') ||
    pathname.startsWith('/api/challenges') ||
    pathname.startsWith('/api/stripe') ||
    pathname.startsWith('/api/confirmo') ||
    pathname.startsWith('/api/rewards')
  ) return 'financial';

  // AI routes - expensive limits
  if (pathname.startsWith('/api/ai')) return 'ai';

  // Admin routes
  if (pathname.startsWith('/api/crm')) return 'admin';

  // Public routes
  if (
    pathname.startsWith('/api/sports') ||
    pathname.startsWith('/api/events')
  ) return 'public';

  // Default API tier
  return 'api';
}

// ==========================================
// EXPORTS
// ==========================================

export { redis, limiters };

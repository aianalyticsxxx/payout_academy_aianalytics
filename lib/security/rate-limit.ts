// ==========================================
// RATE LIMITING - COMPREHENSIVE PROTECTION
// ==========================================
// Apply rate limits to all sensitive endpoints

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// ==========================================
// IN-MEMORY RATE LIMITER FALLBACK
// ==========================================
// Used when Redis is unavailable to maintain protection

interface InMemoryEntry {
  count: number;
  windowStart: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, InMemoryEntry>();
  private readonly maxEntries = 10000; // Prevent memory exhaustion
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 60000; // 1 minute

  async limit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ success: boolean; remaining: number; reset: number }> {
    const now = Date.now();

    // Periodic cleanup to prevent memory leaks
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup(windowMs);
      this.lastCleanup = now;
    }

    const key = identifier;
    const entry = this.store.get(key);

    // If no entry or window expired, start fresh
    if (!entry || now - entry.windowStart >= windowMs) {
      // Check size limit before adding new entry
      if (this.store.size >= this.maxEntries) {
        this.cleanup(windowMs);
        // If still full after cleanup, remove oldest entries
        if (this.store.size >= this.maxEntries) {
          const keysToDelete = Array.from(this.store.keys()).slice(0, 1000);
          keysToDelete.forEach(k => this.store.delete(k));
        }
      }

      this.store.set(key, { count: 1, windowStart: now });
      return {
        success: true,
        remaining: maxRequests - 1,
        reset: now + windowMs,
      };
    }

    // Increment count
    entry.count++;

    if (entry.count > maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset: entry.windowStart + windowMs,
      };
    }

    return {
      success: true,
      remaining: maxRequests - entry.count,
      reset: entry.windowStart + windowMs,
    };
  }

  private cleanup(windowMs: number): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.store.forEach((entry, key) => {
      if (now - entry.windowStart >= windowMs) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.store.delete(key));
  }
}

// Singleton instance for in-memory fallback
const inMemoryLimiter = new InMemoryRateLimiter();

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

// Parse window string to milliseconds
function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 60000; // Default 1 minute

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
}

/**
 * Check rate limit for a request
 * Uses Redis when available, falls back to in-memory limiter
 * @param identifier - User ID, IP, or other identifier
 * @param tier - Rate limit tier to apply
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'api'
): Promise<RateLimitResult> {
  const limiter = limiters[tier];
  const tierConfig = RATE_LIMITS[tier];
  const windowMs = parseWindowToMs(tierConfig.window);

  // SECURITY: Use in-memory fallback if Redis not configured
  if (!limiter) {
    console.warn('[RateLimit] Redis not configured - using in-memory fallback');
    const result = await inMemoryLimiter.limit(
      `${tier}:${identifier}`,
      tierConfig.requests,
      windowMs
    );
    return {
      success: result.success,
      limit: tierConfig.requests,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // SECURITY: Fall back to in-memory limiter on Redis errors
    console.error('[RateLimit] Redis error, using in-memory fallback:', error);
    const result = await inMemoryLimiter.limit(
      `${tier}:${identifier}`,
      tierConfig.requests,
      windowMs
    );
    return {
      success: result.success,
      limit: tierConfig.requests,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
}

/**
 * SECURITY: Validate IPv4 address with octet range checking
 * Returns true only if each octet is 0-255
 */
function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
    // Reject leading zeros (e.g., "01" or "001") to prevent octal interpretation
    if (part.length > 1 && part.startsWith('0')) return false;
  }
  return true;
}

/**
 * SECURITY: Validate IPv6 address format
 * Supports full form, compressed (::), and loopback (::1)
 */
function isValidIPv6(ip: string): boolean {
  // Handle loopback
  if (ip === '::1') return true;

  // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4Part = ip.slice(7);
    return isValidIPv4(ipv4Part);
  }

  // Count colons and check for double colon
  const hasDoubleColon = ip.includes('::');
  const parts = ip.split(':');

  // Full form has exactly 8 parts
  if (!hasDoubleColon && parts.length !== 8) return false;

  // With ::, can have fewer parts
  if (hasDoubleColon) {
    // Only one :: allowed
    if (ip.split('::').length > 2) return false;
    // Must have at least 2 parts total when compressed
    if (parts.length < 2 || parts.length > 8) return false;
  }

  // Validate each part (hex, 1-4 chars)
  for (const part of parts) {
    if (part === '') continue; // Empty parts from :: are ok
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return false;
  }

  return true;
}

/**
 * SECURITY: Extract client IP address from request headers
 * Uses trusted proxy headers in priority order
 * Validates IP format to prevent header injection attacks
 */
export function getClientIp(req: NextRequest): string {
  // Priority order: Cloudflare > Vercel > x-real-ip > x-forwarded-for
  const cfConnecting = req.headers.get('cf-connecting-ip');
  const vercelForwarded = req.headers.get('x-vercel-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const forwarded = req.headers.get('x-forwarded-for');

  // Get the first IP from the chain
  const rawIp = cfConnecting ||
                vercelForwarded?.split(',')[0]?.trim() ||
                realIp ||
                forwarded?.split(',')[0]?.trim() ||
                'unknown';

  // SECURITY: Validate IP format with proper range checking
  if (rawIp.includes(':')) {
    // IPv6
    if (isValidIPv6(rawIp)) return rawIp;
  } else if (rawIp.includes('.')) {
    // IPv4
    if (isValidIPv4(rawIp)) return rawIp;
  }

  // If IP doesn't match expected format, return unknown (don't trust it)
  if (rawIp !== 'unknown') {
    console.warn(`[Security] Invalid IP format detected: ${rawIp.substring(0, 50)}`);
  }
  return 'unknown';
}

/**
 * Get identifier from request (IP or user ID)
 */
export function getIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
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

// ==========================================
// CRM CACHING LAYER
// ==========================================

// Simple in-memory cache for CRM analytics
// For production, consider using Redis

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor() {
    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Get cached data or fetch and cache it
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete data from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const crmCache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  dashboard: (period: string) => `crm:dashboard:${period}`,
  userAnalytics: (period: string) => `crm:users:${period}`,
  challengeAnalytics: (period: string) => `crm:challenges:${period}`,
  betAnalytics: (period: string) => `crm:bets:${period}`,
  aiAnalytics: (period: string) => `crm:ai:${period}`,
  revenueAnalytics: (period: string) => `crm:revenue:${period}`,
  userDetail: (userId: string) => `crm:user:${userId}`,
  pendingRewards: () => `crm:rewards:pending`,
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  DASHBOARD: 60,      // 1 minute
  USERS: 300,         // 5 minutes
  CHALLENGES: 180,    // 3 minutes
  BETS: 120,          // 2 minutes
  AI: 300,            // 5 minutes
  REVENUE: 600,       // 10 minutes
  USER_DETAIL: 120,   // 2 minutes
  PENDING_REWARDS: 60, // 1 minute
};

/**
 * Invalidate cache when data changes
 */
export function invalidateCache(type: 'dashboard' | 'users' | 'challenges' | 'bets' | 'ai' | 'revenue' | 'rewards') {
  switch (type) {
    case 'dashboard':
      crmCache.deletePattern('crm:dashboard:*');
      break;
    case 'users':
      crmCache.deletePattern('crm:users:*');
      crmCache.deletePattern('crm:user:*');
      break;
    case 'challenges':
      crmCache.deletePattern('crm:challenges:*');
      break;
    case 'bets':
      crmCache.deletePattern('crm:bets:*');
      break;
    case 'ai':
      crmCache.deletePattern('crm:ai:*');
      break;
    case 'revenue':
      crmCache.deletePattern('crm:revenue:*');
      break;
    case 'rewards':
      crmCache.deletePattern('crm:rewards:*');
      break;
  }
}

// ==========================================
// GET AI PREDICTIONS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAIPredictions } from '@/lib/db/ai-leaderboard';

// ==========================================
// TYPES
// ==========================================

interface Prediction {
  id: string;
  eventId: string;
  sport: string;
  result: 'won' | 'lost' | 'pending' | 'push';
  [key: string]: unknown;
}

// ==========================================
// IN-MEMORY CACHE FOR PERFORMANCE
// ==========================================

interface CacheEntry {
  data: Prediction[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

function getCacheKey(sport: string, days: number): string {
  return `predictions:${sport}:${days}`;
}

function getFromCache(key: string): Prediction[] | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key: string, data: Prediction[]): void {
  // Limit cache size to prevent memory issues
  if (cache.size > 100) {
    // Remove oldest entries
    const keys = Array.from(cache.keys()).slice(0, 50);
    keys.forEach(k => cache.delete(k));
  }

  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const resultFilter = searchParams.get('result') || 'all';
    const sport = searchParams.get('sport') || 'all';
    const days = Math.min(Math.max(1, parseInt(searchParams.get('days') || '7', 10)), 90); // Max 90 days
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100); // Bounded: 1-100

    // PERFORMANCE: Check cache first (keyed by sport and days, not result filter)
    const cacheKey = getCacheKey(sport, days);
    let allPredictions: Prediction[] = getFromCache(cacheKey) || [];

    if (allPredictions.length === 0) {
      // Cache miss - fetch from database
      allPredictions = await getAIPredictions({
        result: 'all', // Always fetch all first
        sport,
        days,
        limit: 200, // Fetch more to get accurate stats
      }) as Prediction[];

      // Store in cache
      setCache(cacheKey, allPredictions);
    }

    // Stats are calculated from ALL deduplicated predictions
    const total = allPredictions.length;
    const won = allPredictions.filter(p => p.result === 'won').length;
    const lost = allPredictions.filter(p => p.result === 'lost').length;
    const pending = allPredictions.filter(p => p.result === 'pending').length;
    const settled = won + lost;
    const winRate = settled > 0 ? (won / settled) * 100 : 0;

    // Calculate streak from all settled predictions
    let currentStreak = 0;
    const settledPredictions = allPredictions.filter(p => p.result !== 'pending');
    for (const pred of settledPredictions) {
      if (pred.result === 'won') {
        if (currentStreak >= 0) currentStreak++;
        else break;
      } else if (pred.result === 'lost') {
        if (currentStreak <= 0) currentStreak--;
        else break;
      }
    }

    // Get unique sports for filter dropdown
    const sports = [...new Set(allPredictions.map(p => p.sport).filter(Boolean))];

    // Now filter by result for display (after deduplication already happened)
    const filteredPredictions = resultFilter === 'all'
      ? allPredictions
      : allPredictions.filter(p => p.result === resultFilter);

    // Apply limit to filtered results
    const displayPredictions = filteredPredictions.slice(0, limit);

    return NextResponse.json({
      predictions: displayPredictions,
      stats: {
        total,
        won,
        lost,
        pending,
        winRate: winRate.toFixed(1),
        currentStreak,
      },
      sports,
    });

  } catch (error) {
    console.error('Failed to fetch predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}

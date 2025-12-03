// ==========================================
// GET AI PREDICTIONS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAIPredictions } from '@/lib/db/ai-leaderboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const resultFilter = searchParams.get('result') || 'all';
    const sport = searchParams.get('sport') || 'all';
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Always fetch ALL predictions first (no result filter) to ensure consistent deduplication
    const allPredictions = await getAIPredictions({
      result: 'all', // Always fetch all first
      sport,
      days,
      limit: 200, // Fetch more to get accurate stats
    });

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

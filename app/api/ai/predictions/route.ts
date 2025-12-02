// ==========================================
// GET AI PREDICTIONS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAIPredictions } from '@/lib/db/ai-leaderboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = searchParams.get('result') || 'all';
    const sport = searchParams.get('sport') || 'all';
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const predictions = await getAIPredictions({
      result,
      sport,
      days,
      limit,
    });

    // Calculate summary stats
    const total = predictions.length;
    const won = predictions.filter(p => p.result === 'won').length;
    const lost = predictions.filter(p => p.result === 'lost').length;
    const pending = predictions.filter(p => p.result === 'pending').length;
    const settled = won + lost;
    const winRate = settled > 0 ? (won / settled) * 100 : 0;

    // Calculate streak
    let currentStreak = 0;
    const settledPredictions = predictions.filter(p => p.result !== 'pending');
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
    const sports = [...new Set(predictions.map(p => p.sport).filter(Boolean))];

    return NextResponse.json({
      predictions,
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

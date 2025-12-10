// ==========================================
// AI PERFORMANCE ANALYTICS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    const [
      aiLeaderboard,
      predictions,
      consensusDistribution,
    ] = await Promise.all([
      // AI Leaderboard - agent performance
      prisma.aILeaderboard.findMany({
        orderBy: { winRate: 'desc' },
      }),

      // Recent predictions
      prisma.aIPrediction.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      // Consensus distribution (using consensusVerdict field)
      prisma.aIPrediction.groupBy({
        by: ['consensusVerdict'],
        where: {
          createdAt: { gte: startDate },
          consensusVerdict: { not: null },
        },
        _count: true,
      }),
    ]);

    // Calculate overall stats (result uses lowercase: pending, won, lost, push)
    const settledPredictions = predictions.filter((p) => p.result !== 'pending');
    const correctPredictions = predictions.filter((p) => p.result === 'won');
    const overallAccuracy = settledPredictions.length > 0
      ? (correctPredictions.length / settledPredictions.length) * 100
      : 0;

    // Performance by consensus type (using consensusVerdict field)
    const consensusPerformance: Record<string, { total: number; correct: number; rate: number }> = {};
    predictions.forEach((p) => {
      const verdict = p.consensusVerdict || 'UNKNOWN';
      if (!consensusPerformance[verdict]) {
        consensusPerformance[verdict] = { total: 0, correct: 0, rate: 0 };
      }
      if (p.result !== 'pending') {
        consensusPerformance[verdict].total++;
        if (p.result === 'won') {
          consensusPerformance[verdict].correct++;
        }
      }
    });
    Object.keys(consensusPerformance).forEach((c) => {
      const stats = consensusPerformance[c];
      stats.rate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    });

    // Format consensus distribution (using consensusVerdict field)
    const consensusStats: Record<string, number> = {};
    consensusDistribution.forEach((c) => {
      if (c.consensusVerdict) {
        consensusStats[c.consensusVerdict] = c._count;
      }
    });

    // Top and bottom agent
    const topAgent = aiLeaderboard.length > 0 ? aiLeaderboard[0] : null;
    const bottomAgent = aiLeaderboard.length > 1 ? aiLeaderboard[aiLeaderboard.length - 1] : null;

    // Recent predictions for display
    const recentPredictions = predictions.slice(0, 50);

    return NextResponse.json({
      summary: {
        totalPredictions: predictions.length,
        settledPredictions: settledPredictions.length,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        topAgentName: topAgent?.agentName || 'N/A',
        topAgentWinRate: topAgent?.winRate || 0,
      },
      aiLeaderboard,
      consensusStats,
      consensusPerformance,
      recentPredictions,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('AI analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// LEADERBOARD API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getCached, setCache } from '@/lib/redis';

const CACHE_KEY = 'global-leaderboard';
const CACHE_TTL = 300; // 5 minutes

// ==========================================
// GET - Get leaderboard
// ==========================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const type = searchParams.get('type') || 'global'; // global, ai

    if (type === 'ai') {
      return getAILeaderboard();
    }

    // Check cache
    const cached = await getCached<any>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get leaderboard with user info
    const entries = await prisma.globalLeaderboard.findMany({
      where: {
        totalBets: { gte: 10 }, // Minimum 10 bets
      },
      orderBy: [
        { roi: 'desc' },
        { winRate: 'desc' },
        { wins: 'desc' },
      ],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            tier: true,
          },
        },
      },
    });

    // Format response
    const leaderboard = entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      username: entry.user.username || 'Anonymous',
      avatar: entry.user.avatar || '🎲',
      tier: entry.tier,
      wins: entry.wins,
      losses: entry.losses,
      pushes: entry.pushes,
      totalBets: entry.totalBets,
      winRate: Math.round(entry.winRate * 100) / 100,
      roi: Math.round(entry.roi * 100) / 100,
      totalProfit: Math.round(entry.totalProfit * 100) / 100,
      currentStreak: entry.currentStreak,
      bestStreak: entry.bestStreak,
    }));

    const response = {
      leaderboard,
      total: leaderboard.length,
      updatedAt: new Date().toISOString(),
    };

    // Cache
    await setCache(CACHE_KEY, response, CACHE_TTL);

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

async function getAILeaderboard() {
  const cached = await getCached<any>('ai-leaderboard-full');
  if (cached) {
    return NextResponse.json(cached);
  }

  const entries = await prisma.aILeaderboard.findMany({
    orderBy: [
      { winRate: 'desc' },
      { totalPredictions: 'desc' },
    ],
  });

  const leaderboard = entries.map((entry, index) => ({
    rank: index + 1,
    agentId: entry.agentId,
    agentName: entry.agentName,
    emoji: entry.emoji,
    wins: entry.wins,
    losses: entry.losses,
    pushes: entry.pushes,
    totalPredictions: entry.totalPredictions,
    winRate: Math.round(entry.winRate * 10000) / 100, // Convert to percentage
    roi: Math.round(entry.roi * 100) / 100,
    currentStreak: entry.currentStreak,
    bestStreak: entry.bestStreak,
    voteWeight: entry.voteWeight,
  }));

  const response = {
    leaderboard,
    total: leaderboard.length,
    updatedAt: new Date().toISOString(),
  };

  await setCache('ai-leaderboard-full', response, CACHE_TTL);

  return NextResponse.json(response);
}

// ==========================================
// GET User's rank (internal helper)
// ==========================================

async function getUserRank(userId: string) {
  const entry = await prisma.globalLeaderboard.findUnique({
    where: { userId },
  });

  if (!entry || entry.totalBets < 10) {
    return null;
  }

  // Count how many users have better ROI
  const betterCount = await prisma.globalLeaderboard.count({
    where: {
      totalBets: { gte: 10 },
      OR: [
        { roi: { gt: entry.roi } },
        {
          roi: entry.roi,
          winRate: { gt: entry.winRate },
        },
      ],
    },
  });

  return betterCount + 1;
}

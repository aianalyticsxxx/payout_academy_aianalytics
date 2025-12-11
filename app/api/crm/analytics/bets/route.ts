// ==========================================
// BETTING ANALYTICS API
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
      bets,
      parlays,
      betsBySport,
      betsByType,
      recentBets,
      highStakeBets,
      unsettledBets,
      betsWithChallenge,
    ] = await Promise.all([
      // All bets in period
      prisma.bet.findMany({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // All parlays in period
      prisma.parlay.findMany({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Bets grouped by sport
      prisma.bet.groupBy({
        by: ['sport'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
        _sum: { stake: true, profitLoss: true },
      }),

      // Bets grouped by type
      prisma.bet.groupBy({
        by: ['betType'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),

      // Recent bets (last 50)
      prisma.bet.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
      }),

      // High stake bets (>$50)
      prisma.bet.findMany({
        where: {
          createdAt: { gte: startDate },
          stake: { gte: 50 },
        },
        orderBy: { stake: 'desc' },
        take: 20,
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
      }),

      // Unsettled bets
      prisma.bet.findMany({
        where: {
          result: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
      }),

      // Bets with challenge info for difficulty tracking
      prisma.bet.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        include: {
          challengeBet: {
            include: {
              challenge: {
                select: { difficulty: true },
              },
            },
          },
        },
      }),
    ]);

    // Helper to convert league key to sport name
    const getSportName = (leagueKey: string): string => {
      const key = leagueKey.toLowerCase();
      // Handle both formats: "basketball_nba" and "NBA"
      if (key.startsWith('basketball') || key === 'nba' || key === 'euroleague' || key === 'ncaab') return 'Basketball';
      if (key.startsWith('soccer') || key === 'epl' || key === 'la_liga' || key === 'serie_a' || key === 'bundesliga' || key === 'ligue_1' || key === 'champions_league' || key === 'europa_league') return 'Football';
      if (key.startsWith('americanfootball') || key === 'nfl' || key === 'ncaaf') return 'American Football';
      if (key.startsWith('icehockey') || key === 'nhl') return 'Ice Hockey';
      if (key.startsWith('baseball') || key === 'mlb') return 'Baseball';
      if (key.startsWith('tennis') || key === 'atp' || key === 'wta') return 'Tennis';
      if (key.startsWith('mma') || key === 'ufc') return 'MMA';
      if (key.startsWith('boxing')) return 'Boxing';
      if (key.startsWith('golf') || key === 'pga') return 'Golf';
      if (key.startsWith('aussierules') || key === 'afl') return 'Aussie Rules';
      if (key.startsWith('rugbyleague') || key === 'nrl') return 'Rugby League';
      if (key.startsWith('rugbyunion')) return 'Rugby Union';
      return leagueKey;
    };

    // Calculate summary stats
    const totalBets = bets.length;
    const totalParlays = parlays.length;
    const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);
    const parlayStaked = parlays.reduce((sum, p) => sum + p.stake, 0);

    const wonBets = bets.filter((b) => b.result === 'WON').length;
    const lostBets = bets.filter((b) => b.result === 'LOST').length;
    const settledBets = wonBets + lostBets;
    const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;

    const totalProfitLoss = bets.reduce((sum, b) => sum + (b.profitLoss || 0), 0);

    // Win rate by sport (aggregated by sport name, not league)
    const winRateBySport: Record<string, { wins: number; losses: number; rate: number }> = {};
    bets.forEach((bet) => {
      const sportName = getSportName(bet.sport);
      if (!winRateBySport[sportName]) {
        winRateBySport[sportName] = { wins: 0, losses: 0, rate: 0 };
      }
      if (bet.result === 'WON') winRateBySport[sportName].wins++;
      if (bet.result === 'LOST') winRateBySport[sportName].losses++;
    });
    Object.keys(winRateBySport).forEach((sport) => {
      const s = winRateBySport[sport];
      const total = s.wins + s.losses;
      s.rate = total > 0 ? (s.wins / total) * 100 : 0;
    });

    // Format bets by sport (aggregated by sport name, not league)
    const sportStats: Record<string, { count: number; staked: number; profitLoss: number }> = {};
    betsBySport.forEach((s) => {
      const sportName = getSportName(s.sport);
      if (!sportStats[sportName]) {
        sportStats[sportName] = { count: 0, staked: 0, profitLoss: 0 };
      }
      sportStats[sportName].count += s._count;
      sportStats[sportName].staked += s._sum.stake || 0;
      sportStats[sportName].profitLoss += s._sum.profitLoss || 0;
    });

    // Format bet type distribution
    const typeDistribution: Record<string, number> = {};
    betsByType.forEach((t) => {
      typeDistribution[t.betType] = t._count;
    });

    // Calculate difficulty stats (Beginner vs Pro)
    const difficultyStats = {
      beginner: { count: 0, wins: 0, losses: 0, staked: 0, winRate: 0 },
      pro: { count: 0, wins: 0, losses: 0, staked: 0, winRate: 0 },
      unlinked: { count: 0, wins: 0, losses: 0, staked: 0, winRate: 0 }, // Bets not linked to a challenge
    };

    betsWithChallenge.forEach((bet) => {
      const difficulty = bet.challengeBet?.challenge?.difficulty || 'unlinked';
      const key = difficulty as keyof typeof difficultyStats;

      if (difficultyStats[key]) {
        difficultyStats[key].count++;
        difficultyStats[key].staked += bet.stake;
        if (bet.result === 'WON') difficultyStats[key].wins++;
        if (bet.result === 'LOST') difficultyStats[key].losses++;
      }
    });

    // Calculate win rates for each difficulty
    Object.keys(difficultyStats).forEach((key) => {
      const stats = difficultyStats[key as keyof typeof difficultyStats];
      const settled = stats.wins + stats.losses;
      stats.winRate = settled > 0 ? Math.round((stats.wins / settled) * 1000) / 10 : 0;
    });

    return NextResponse.json({
      summary: {
        totalBets,
        totalParlays,
        totalStaked: totalStaked + parlayStaked,
        winRate: Math.round(winRate * 10) / 10,
        totalProfitLoss,
        unsettledCount: unsettledBets.length,
      },
      sportStats,
      winRateBySport,
      typeDistribution,
      difficultyStats,
      recentBets,
      highStakeBets,
      unsettledBets,
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

    console.error('Betting analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

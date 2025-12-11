// ==========================================
// CHALLENGE ANALYTICS API
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

    // Get all challenges in period
    const [
      challenges,
      revenueByTier,
      statusCounts,
      recentChallenges,
      expiringSoon,
      difficultyStats,
      rewardsSummary,
    ] = await Promise.all([
      // All challenges in period
      prisma.challenge.findMany({
        where: {
          purchasedAt: { gte: startDate },
        },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
      }),

      // Revenue by tier
      prisma.challenge.groupBy({
        by: ['tier'],
        where: {
          purchasedAt: { gte: startDate },
        },
        _sum: { cost: true },
        _count: true,
      }),

      // Status counts
      prisma.challenge.groupBy({
        by: ['status'],
        where: {
          purchasedAt: { gte: startDate },
        },
        _count: true,
      }),

      // Recent challenges (last 20)
      prisma.challenge.findMany({
        take: 20,
        orderBy: { purchasedAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
      }),

      // Expiring within 3 days
      prisma.challenge.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            gte: now,
            lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
        orderBy: { expiresAt: 'asc' },
      }),

      // Difficulty breakdown
      prisma.challenge.groupBy({
        by: ['difficulty'],
        where: {
          purchasedAt: { gte: startDate },
        },
        _sum: { cost: true, totalRewardsEarned: true },
        _count: true,
      }),

      // Rewards summary
      prisma.challenge.aggregate({
        where: {
          purchasedAt: { gte: startDate },
        },
        _sum: { totalRewardsEarned: true },
      }),
    ]);

    // Calculate completion rates by tier
    const completionByTier: Record<number, { total: number; completed: number; rate: number }> = {};
    challenges.forEach((c) => {
      if (!completionByTier[c.tier]) {
        completionByTier[c.tier] = { total: 0, completed: 0, rate: 0 };
      }
      completionByTier[c.tier].total++;
      if (c.status === 'COMPLETED') {
        completionByTier[c.tier].completed++;
      }
    });
    Object.keys(completionByTier).forEach((tier) => {
      const t = completionByTier[Number(tier)];
      t.rate = t.total > 0 ? (t.completed / t.total) * 100 : 0;
    });

    // Calculate level distribution (active challenges by current level)
    const levelDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
    challenges.forEach((c) => {
      if (c.status === 'ACTIVE') {
        levelDistribution[c.currentLevel as 1 | 2 | 3 | 4]++;
      }
    });

    // Calculate completed levels count
    const completedLevels = { 1: 0, 2: 0, 3: 0, 4: 0 };
    challenges.forEach((c) => {
      if (c.level1Completed) completedLevels[1]++;
      if (c.level2Completed) completedLevels[2]++;
      if (c.level3Completed) completedLevels[3]++;
      if (c.level4Completed) completedLevels[4]++;
    });

    // Average days to complete
    const completedChallenges = challenges.filter((c) => c.status === 'COMPLETED' && c.completedAt);
    const avgDaysToComplete =
      completedChallenges.length > 0
        ? completedChallenges.reduce((sum, c) => {
            const days = (c.completedAt!.getTime() - c.purchasedAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedChallenges.length
        : 0;

    // Format revenue by tier
    const revenueData: Record<number, { revenue: number; count: number }> = {};
    revenueByTier.forEach((r) => {
      revenueData[r.tier] = {
        revenue: r._sum.cost || 0,
        count: r._count,
      };
    });

    // Format status counts
    const statusData: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statusData[s.status] = s._count;
    });

    // Format difficulty breakdown
    const difficultyBreakdown: Record<string, { count: number; revenue: number; rewardsEarned: number }> = {};
    difficultyStats.forEach((d) => {
      difficultyBreakdown[d.difficulty] = {
        count: d._count,
        revenue: d._sum.cost || 0,
        rewardsEarned: d._sum.totalRewardsEarned || 0,
      };
    });

    // Calculate completion rates by difficulty
    const completionByDifficulty: Record<string, { total: number; completed: number; rate: number }> = {};
    challenges.forEach((c) => {
      if (!completionByDifficulty[c.difficulty]) {
        completionByDifficulty[c.difficulty] = { total: 0, completed: 0, rate: 0 };
      }
      completionByDifficulty[c.difficulty].total++;
      if (c.status === 'COMPLETED') {
        completionByDifficulty[c.difficulty].completed++;
      }
    });
    Object.keys(completionByDifficulty).forEach((diff) => {
      const d = completionByDifficulty[diff];
      d.rate = d.total > 0 ? (d.completed / d.total) * 100 : 0;
    });

    return NextResponse.json({
      summary: {
        totalChallenges: challenges.length,
        totalRevenue: challenges.reduce((sum, c) => sum + c.cost, 0),
        avgDaysToComplete: Math.round(avgDaysToComplete * 10) / 10,
        completionRate:
          challenges.length > 0
            ? (completedChallenges.length / challenges.length) * 100
            : 0,
        totalRewardsEarned: rewardsSummary._sum.totalRewardsEarned || 0,
      },
      revenueByTier: revenueData,
      statusDistribution: statusData,
      completionByTier,
      levelDistribution,
      completedLevels,
      difficultyBreakdown,
      completionByDifficulty,
      recentChallenges,
      expiringSoon,
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

    console.error('Challenge analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

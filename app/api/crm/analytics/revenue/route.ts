// ==========================================
// REVENUE ANALYTICS API
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

    // Get MTD and YTD dates
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ytdStart = new Date(now.getFullYear(), 0, 1);

    const [
      periodChallenges,
      mtdChallenges,
      ytdChallenges,
      allTimeChallenges,
      revenueByTier,
      pendingRewards,
      topRevenueUsers,
      recentPurchases,
    ] = await Promise.all([
      // Period revenue
      prisma.challenge.aggregate({
        where: { purchasedAt: { gte: startDate } },
        _sum: { cost: true },
        _count: true,
      }),

      // MTD revenue
      prisma.challenge.aggregate({
        where: { purchasedAt: { gte: mtdStart } },
        _sum: { cost: true },
        _count: true,
      }),

      // YTD revenue
      prisma.challenge.aggregate({
        where: { purchasedAt: { gte: ytdStart } },
        _sum: { cost: true },
        _count: true,
      }),

      // All-time revenue
      prisma.challenge.aggregate({
        _sum: { cost: true },
        _count: true,
      }),

      // Revenue breakdown by tier
      prisma.challenge.groupBy({
        by: ['tier'],
        where: { purchasedAt: { gte: startDate } },
        _sum: { cost: true },
        _count: true,
      }),

      // Pending rewards (liability)
      prisma.challengeReward.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),

      // Top revenue users
      prisma.challenge.groupBy({
        by: ['userId'],
        _sum: { cost: true },
        _count: true,
        orderBy: { _sum: { cost: 'desc' } },
        take: 10,
      }),

      // Recent purchases
      prisma.challenge.findMany({
        where: { purchasedAt: { gte: startDate } },
        orderBy: { purchasedAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
        },
      }),
    ]);

    // Get user details for top revenue users
    const userIds = topRevenueUsers.map((u) => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const topUsers = topRevenueUsers.map((u) => ({
      ...userMap.get(u.userId),
      totalSpent: u._sum.cost || 0,
      challengeCount: u._count,
    }));

    // Calculate ARPU
    const totalUsers = await prisma.user.count();
    const allTimeRevenue = allTimeChallenges._sum.cost || 0;
    const arpu = totalUsers > 0 ? allTimeRevenue / totalUsers : 0;

    // Paying users count
    const payingUsers = await prisma.challenge.groupBy({
      by: ['userId'],
      _count: true,
    });

    // Format revenue by tier
    const tierRevenue: Record<number, { revenue: number; count: number }> = {};
    revenueByTier.forEach((t) => {
      tierRevenue[t.tier] = {
        revenue: t._sum.cost || 0,
        count: t._count,
      };
    });

    // Daily revenue for chart (last 30 days)
    const dailyRevenue: Array<{ date: string; revenue: number; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRevenue = await prisma.challenge.aggregate({
        where: {
          purchasedAt: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: { cost: true },
        _count: true,
      });

      dailyRevenue.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue._sum.cost || 0,
        count: dayRevenue._count,
      });
    }

    return NextResponse.json({
      summary: {
        periodRevenue: periodChallenges._sum.cost || 0,
        periodCount: periodChallenges._count,
        mtdRevenue: mtdChallenges._sum.cost || 0,
        ytdRevenue: ytdChallenges._sum.cost || 0,
        allTimeRevenue: allTimeChallenges._sum.cost || 0,
        pendingRewards: pendingRewards._sum.amount || 0,
        pendingRewardsCount: pendingRewards._count,
        arpu: Math.round(arpu * 100) / 100,
        totalUsers,
        payingUsers: payingUsers.length,
        conversionRate: totalUsers > 0 ? (payingUsers.length / totalUsers) * 100 : 0,
      },
      tierRevenue,
      dailyRevenue,
      topUsers,
      recentPurchases,
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

    console.error('Revenue analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

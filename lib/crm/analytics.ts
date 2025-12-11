// ==========================================
// CRM ANALYTICS LIBRARY
// ==========================================

import { prisma } from '@/lib/db/prisma';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getPeriodStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

// ==========================================
// DASHBOARD METRICS
// ==========================================

export async function getDashboardMetrics(period: string = '30d') {
  const startDate = getPeriodStartDate(period);
  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  const [
    totalUsers,
    newUsers,
    activeUsers,
    activeChallenges,
    challengeRevenue,
    pendingRewards,
    paidRewards,
    totalBets,
    aiAccuracy,
    mtdRevenue,
    ytdRevenue,
    allTimeRevenue,
    payingUsersData,
    topRevenueUsers,
    dailyRevenueData,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startDate } } }),
    getActiveUsersCount(startDate),
    prisma.challenge.count({ where: { status: 'active' } }),
    getChallengeRevenue(startDate),
    getPendingRewardsTotal(),
    getPaidRewardsTotal(),
    prisma.bet.count({ where: { createdAt: { gte: startDate } } }),
    getAIAccuracy(),
    // MTD Revenue
    prisma.challenge.aggregate({
      where: { purchasedAt: { gte: mtdStart } },
      _sum: { cost: true },
    }),
    // YTD Revenue
    prisma.challenge.aggregate({
      where: { purchasedAt: { gte: ytdStart } },
      _sum: { cost: true },
    }),
    // All-time Revenue
    prisma.challenge.aggregate({
      _sum: { cost: true },
    }),
    // Paying users count
    prisma.challenge.groupBy({
      by: ['userId'],
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
    // Daily revenue for last 30 days
    getDailyRevenue(),
  ]);

  // Get user details for top spenders
  const userIds = topRevenueUsers.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, email: true, avatar: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topSpenders = topRevenueUsers.map((u) => ({
    ...userMap.get(u.userId),
    totalSpent: u._sum.cost || 0,
    challengeCount: u._count,
  }));

  // Calculate ARPU
  const allTime = allTimeRevenue._sum.cost || 0;
  const arpu = totalUsers > 0 ? allTime / totalUsers : 0;
  const conversionRate = totalUsers > 0 ? (payingUsersData.length / totalUsers) * 100 : 0;

  return {
    users: {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      paying: payingUsersData.length,
    },
    challenges: {
      active: activeChallenges,
    },
    revenue: {
      ...challengeRevenue,
      mtd: mtdRevenue._sum.cost || 0,
      ytd: ytdRevenue._sum.cost || 0,
      allTime: allTime,
      arpu: Math.round(arpu * 100) / 100,
      conversionRate: Math.round(conversionRate * 10) / 10,
    },
    rewards: {
      pending: pendingRewards,
      paid: paidRewards,
    },
    bets: {
      total: totalBets,
    },
    ai: aiAccuracy,
    topSpenders,
    dailyRevenue: dailyRevenueData,
  };
}

async function getDailyRevenue() {
  // Get all challenges from last 30 days in a single query
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const challenges = await prisma.challenge.findMany({
    where: { purchasedAt: { gte: thirtyDaysAgo } },
    select: { purchasedAt: true, cost: true },
  });

  // Initialize map for last 30 days
  const dailyRevenueMap = new Map<string, { revenue: number; count: number }>();
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyRevenueMap.set(dateKey, { revenue: 0, count: 0 });
  }

  // Aggregate from fetched challenges
  challenges.forEach((c) => {
    const dateKey = c.purchasedAt.toISOString().split('T')[0];
    const existing = dailyRevenueMap.get(dateKey);
    if (existing) {
      existing.revenue += c.cost;
      existing.count += 1;
    }
  });

  // Convert to sorted array
  return Array.from(dailyRevenueMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));
}

async function getActiveUsersCount(since: Date) {
  // Users who placed a bet since the given date
  const users = await prisma.bet.findMany({
    where: { createdAt: { gte: since } },
    select: { userId: true },
    distinct: ['userId'],
  });
  return users.length;
}

async function getChallengeRevenue(since: Date) {
  const challenges = await prisma.challenge.findMany({
    where: { purchasedAt: { gte: since } },
    select: { cost: true, tier: true },
  });

  const total = challenges.reduce((sum, c) => sum + c.cost, 0);
  const byTier = challenges.reduce((acc, c) => {
    if (!acc[c.tier]) {
      acc[c.tier] = { revenue: 0, count: 0 };
    }
    acc[c.tier].revenue += c.cost;
    acc[c.tier].count += 1;
    return acc;
  }, {} as Record<number, { revenue: number; count: number }>);

  return {
    total,
    byTier,
    count: challenges.length,
  };
}

async function getPendingRewardsTotal() {
  const result = await prisma.challengeReward.aggregate({
    where: { status: 'pending' },
    _sum: { amount: true },
    _count: true,
  });

  return {
    total: result._sum.amount || 0,
    count: result._count,
  };
}

async function getPaidRewardsTotal() {
  const result = await prisma.challengeReward.aggregate({
    where: { status: 'paid' },
    _sum: { amount: true },
    _count: true,
  });

  return {
    total: result._sum.amount || 0,
    count: result._count,
  };
}

async function getAIAccuracy() {
  const agents = await prisma.aILeaderboard.findMany();

  if (agents.length === 0) {
    return {
      overallWinRate: 0,
      topAgent: null,
    };
  }

  const totalWins = agents.reduce((sum, a) => sum + a.wins, 0);
  const totalPredictions = agents.reduce((sum, a) => sum + a.totalPredictions, 0);

  return {
    overallWinRate:
      totalPredictions > 0 ? (totalWins / totalPredictions) * 100 : 0,
    topAgent: agents.sort((a, b) => b.winRate - a.winRate)[0],
  };
}

// ==========================================
// USER ANALYTICS
// ==========================================

export async function getUserAnalytics(filters: {
  page?: number;
  limit?: number;
  search?: string;
  tier?: string;
  difficulty?: string;
  hasChallenge?: boolean;
}) {
  const { page = 1, limit = 50, search = '', tier = '', difficulty = '', hasChallenge = false } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tier) {
    where.tier = tier;
  }

  // Filter by challenge difficulty - users with challenges of specified difficulty
  if (difficulty) {
    where.challenges = {
      some: {
        difficulty: difficulty,
      },
    };
  }

  let users = await prisma.user.findMany({
    where,
    include: {
      leaderboardEntry: true,
      _count: {
        select: {
          challenges: { where: { status: 'active' } },
          bets: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  // Filter by active challenge if needed
  if (hasChallenge) {
    users = users.filter((u) => u._count.challenges > 0);
  }

  const total = await prisma.user.count({ where });

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// ==========================================
// CHALLENGE ANALYTICS
// ==========================================

export async function getChallengeAnalytics(period: string = '30d') {
  const startDate = getPeriodStartDate(period);

  const [challenges, completionStats] = await Promise.all([
    prisma.challenge.findMany({
      where: { purchasedAt: { gte: startDate } },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { purchasedAt: 'desc' },
      take: 100,
    }),
    getChallengeCompletionStats(startDate),
  ]);

  // Revenue by tier
  const revenueByTier = challenges.reduce((acc, c) => {
    acc[c.tier] = (acc[c.tier] || 0) + c.cost;
    return acc;
  }, {} as Record<number, number>);

  // Status breakdown
  const statusBreakdown = challenges.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    challenges,
    revenueByTier,
    statusBreakdown,
    completionStats,
  };
}

async function getChallengeCompletionStats(since: Date) {
  const challenges = await prisma.challenge.findMany({
    where: { purchasedAt: { gte: since } },
    select: {
      tier: true,
      status: true,
      level4Completed: true,
      purchasedAt: true,
      completedAt: true,
    },
  });

  const byTier: Record<number, { total: number; completed: number; avgDays: number }> = {};

  challenges.forEach((c) => {
    if (!byTier[c.tier]) {
      byTier[c.tier] = { total: 0, completed: 0, avgDays: 0 };
    }
    byTier[c.tier].total++;
    if (c.level4Completed) {
      byTier[c.tier].completed++;
      if (c.completedAt) {
        const days = Math.floor(
          (c.completedAt.getTime() - c.purchasedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        byTier[c.tier].avgDays += days;
      }
    }
  });

  // Calculate average days
  Object.keys(byTier).forEach((tier) => {
    const t = parseInt(tier);
    if (byTier[t].completed > 0) {
      byTier[t].avgDays = byTier[t].avgDays / byTier[t].completed;
    }
  });

  return byTier;
}

// ==========================================
// BETTING ANALYTICS
// ==========================================

export async function getBettingAnalytics(period: string = '30d') {
  const startDate = getPeriodStartDate(period);

  const [bets, parlays] = await Promise.all([
    prisma.bet.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        sport: true,
        betType: true,
        stake: true,
        result: true,
        createdAt: true,
      },
    }),
    prisma.parlay.count({ where: { createdAt: { gte: startDate } } }),
  ]);

  const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);

  // By sport
  const bySport = bets.reduce((acc, b) => {
    if (!acc[b.sport]) {
      acc[b.sport] = { count: 0, won: 0, lost: 0 };
    }
    acc[b.sport].count++;
    if (b.result === 'won') acc[b.sport].won++;
    if (b.result === 'lost') acc[b.sport].lost++;
    return acc;
  }, {} as Record<string, { count: number; won: number; lost: number }>);

  // By bet type
  const byType = bets.reduce((acc, b) => {
    acc[b.betType] = (acc[b.betType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalBets: bets.length,
    totalParlays: parlays,
    totalStaked,
    bySport,
    byType,
    recentBets: bets.slice(0, 100),
  };
}

// ==========================================
// REWARD MANAGEMENT
// ==========================================

export async function getPendingRewards() {
  const rewards = await prisma.challengeReward.findMany({
    where: { status: 'pending' },
    include: {
      challenge: {
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      },
    },
    orderBy: { earnedAt: 'asc' },
  });

  return rewards;
}

export async function markRewardAsPaid(rewardId: string, adminId: string) {
  const reward = await prisma.challengeReward.update({
    where: { id: rewardId },
    data: {
      status: 'paid',
      paidAt: new Date(),
    },
  });

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminId,
      action: 'PAY_REWARD',
      targetType: 'REWARD',
      targetId: rewardId,
      metadata: {
        amount: reward.amount,
        level: reward.level,
      },
    },
  });

  return reward;
}

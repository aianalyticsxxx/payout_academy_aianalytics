// ==========================================
// USER PROFILE API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  avatar: z.string().optional(),
});

// ==========================================
// GET - Get user profile and stats
// ==========================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        tier: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get leaderboard stats
    const stats = await prisma.globalLeaderboard.findUnique({
      where: { userId },
    });

    // Get user's rank
    let rank = null;
    if (stats && stats.totalBets >= 10) {
      const betterCount = await prisma.globalLeaderboard.count({
        where: {
          totalBets: { gte: 10 },
          OR: [
            { roi: { gt: stats.roi } },
            {
              roi: stats.roi,
              winRate: { gt: stats.winRate },
            },
          ],
        },
      });
      rank = betterCount + 1;
    }

    // Get recent bets
    const recentBets = await prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get active challenges
    const activeChallenges = await prisma.challenge.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        rewards: true,
      },
      orderBy: { purchasedAt: 'desc' },
    });

    // Get completed challenges count
    const completedChallenges = await prisma.challenge.count({
      where: {
        userId,
        status: 'completed',
      },
    });

    // Get total rewards earned
    const rewardsData = await prisma.challengeReward.aggregate({
      where: {
        challenge: { userId },
        status: 'paid',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get recent parlays
    const recentParlays = await prisma.parlay.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        legs: true,
      },
    });

    // Calculate parlay stats
    const parlayStats = await prisma.parlay.aggregate({
      where: { userId },
      _count: true,
    });

    const parlayWins = await prisma.parlay.count({
      where: { userId, result: 'won' },
    });

    // Get total users for rank context
    const totalRankedUsers = await prisma.globalLeaderboard.count({
      where: { totalBets: { gte: 10 } },
    });

    // Calculate achievements
    const achievements = [];

    // Betting milestones
    if (stats) {
      if (stats.totalBets >= 10) achievements.push({ id: 'first_ten', name: 'Getting Started', description: '10 bets placed', icon: '🎯' });
      if (stats.totalBets >= 50) achievements.push({ id: 'fifty_bets', name: 'Regular', description: '50 bets placed', icon: '📊' });
      if (stats.totalBets >= 100) achievements.push({ id: 'century', name: 'Century Club', description: '100 bets placed', icon: '💯' });
      if (stats.totalBets >= 500) achievements.push({ id: 'high_roller', name: 'High Roller', description: '500 bets placed', icon: '🎰' });

      // Win streaks
      if (stats.bestStreak >= 5) achievements.push({ id: 'hot_streak', name: 'Hot Streak', description: '5 win streak', icon: '🔥' });
      if (stats.bestStreak >= 10) achievements.push({ id: 'on_fire', name: 'On Fire', description: '10 win streak', icon: '💥' });

      // Win rate
      if (stats.winRate >= 55 && stats.totalBets >= 20) achievements.push({ id: 'sharp', name: 'Sharp Bettor', description: '55%+ win rate', icon: '🎯' });
      if (stats.winRate >= 60 && stats.totalBets >= 50) achievements.push({ id: 'elite', name: 'Elite Bettor', description: '60%+ win rate', icon: '⭐' });

      // ROI
      if (stats.roi >= 10 && stats.totalBets >= 20) achievements.push({ id: 'profitable', name: 'Profitable', description: '10%+ ROI', icon: '📈' });
      if (stats.roi >= 25 && stats.totalBets >= 50) achievements.push({ id: 'money_maker', name: 'Money Maker', description: '25%+ ROI', icon: '💰' });
    }

    // Challenge achievements
    if (completedChallenges >= 1) achievements.push({ id: 'challenger', name: 'Challenger', description: 'Complete a challenge', icon: '🏆' });
    if (completedChallenges >= 5) achievements.push({ id: 'champion', name: 'Champion', description: 'Complete 5 challenges', icon: '👑' });

    // Parlay achievements
    if (parlayWins >= 1) achievements.push({ id: 'parlay_winner', name: 'Parlay Winner', description: 'Win a parlay', icon: '🎲' });
    if (parlayWins >= 5) achievements.push({ id: 'parlay_master', name: 'Parlay Master', description: 'Win 5 parlays', icon: '🃏' });

    // Tier achievements
    if (user.tier === 'Silver') achievements.push({ id: 'silver', name: 'Silver Tier', description: 'Reach Silver tier', icon: '🥈' });
    if (user.tier === 'Gold') achievements.push({ id: 'gold', name: 'Gold Tier', description: 'Reach Gold tier', icon: '🥇' });
    if (user.tier === 'Platinum') achievements.push({ id: 'platinum', name: 'Platinum Tier', description: 'Reach Platinum tier', icon: '💠' });
    if (user.tier === 'Diamond') achievements.push({ id: 'diamond', name: 'Diamond Tier', description: 'Reach Diamond tier', icon: '💎' });

    return NextResponse.json({
      user,
      stats: stats || {
        wins: 0,
        losses: 0,
        pushes: 0,
        totalBets: 0,
        totalStaked: 0,
        totalProfit: 0,
        roi: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
      rank,
      totalRankedUsers,
      recentBets,
      activeChallenges,
      completedChallenges,
      totalRewardsEarned: rewardsData._sum.amount || 0,
      rewardsCount: rewardsData._count || 0,
      recentParlays,
      parlayStats: {
        total: parlayStats._count || 0,
        wins: parlayWins,
      },
      achievements,
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// ==========================================
// PATCH - Update profile
// ==========================================

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const data = UpdateProfileSchema.parse(body);

    // Check username availability
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: data.username,
          id: { not: userId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.avatar && { avatar: data.avatar }),
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        tier: true,
      },
    });

    return NextResponse.json(user);
    
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

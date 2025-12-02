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
      take: 5,
    });

    return NextResponse.json({
      user,
      stats: stats || {
        wins: 0,
        losses: 0,
        pushes: 0,
        totalBets: 0,
        totalProfit: 0,
        roi: 0,
        winRate: 0,
        currentStreak: 0,
      },
      rank,
      recentBets,
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

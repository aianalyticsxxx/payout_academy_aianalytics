// ==========================================
// USER DETAIL API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/crm/adminLog';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session } = await requireAdmin();
    const userId = params.id;

    // Log admin action
    await logAdminAction({
      adminId: (session.user as any).id,
      action: 'VIEW_USER',
      targetType: 'USER',
      targetId: userId,
    });

    // Fetch user with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        tier: true,
        role: true,
        createdAt: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch leaderboard stats
    const leaderboard = await prisma.globalLeaderboard.findUnique({
      where: { userId },
    });

    // Fetch challenges
    const challenges = await prisma.challenge.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
      take: 20,
    });

    // Fetch recent bets
    const recentBets = await prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Fetch parlays
    const parlays = await prisma.parlay.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        legs: true,
      },
    });

    // Calculate stats
    const totalChallenges = challenges.length;
    const activeChallenges = challenges.filter(
      (c) => c.status === 'ACTIVE' && c.expiresAt > new Date()
    ).length;
    const completedChallenges = challenges.filter(
      (c) => c.status === 'COMPLETED'
    ).length;
    const totalSpent = challenges.reduce((sum, c) => sum + (c.cost || 0), 0);
    const totalRewardsEarned = challenges.reduce(
      (sum, c) => sum + (c.totalRewardsEarned || 0),
      0
    );

    return NextResponse.json({
      user,
      stats: {
        totalBets: leaderboard?.totalBets || 0,
        wins: leaderboard?.wins || 0,
        losses: leaderboard?.losses || 0,
        pushes: leaderboard?.pushes || 0,
        winRate: leaderboard?.winRate || 0,
        totalProfit: leaderboard?.totalProfit || 0,
        roi: leaderboard?.roi || 0,
        currentStreak: leaderboard?.currentStreak || 0,
        bestStreak: leaderboard?.bestStreak || 0,
        totalChallenges,
        activeChallenges,
        completedChallenges,
        totalSpent,
        totalRewardsEarned,
      },
      recentBets,
      challenges,
      parlays,
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

    console.error('User detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, role } = await requireAdmin();
    const userId = params.id;
    const body = await req.json();
    const { role: newRole } = body;

    // Only super admins can change roles
    if (newRole && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only super admins can change user roles' },
        { status: 403 }
      );
    }

    // Validate role value
    if (newRole && !['USER', 'ADMIN', 'SUPER_ADMIN'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(newRole && {
          role: newRole,
          roleUpdatedAt: new Date(),
          roleUpdatedBy: (session.user as any).id,
        }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: (session.user as any).id,
      action: 'UPDATE_USER_ROLE',
      targetType: 'USER',
      targetId: userId,
      metadata: { oldRole: body.oldRole, newRole },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Super admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    console.error('User update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

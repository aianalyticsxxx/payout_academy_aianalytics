// ==========================================
// CLAIM REWARDS API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

// ==========================================
// POST - Claim pending rewards (mark as paid)
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { challengeId } = body;

    // Find all pending rewards for the user (optionally filtered by challenge)
    const whereClause: any = {
      status: 'pending',
      challenge: {
        userId,
      },
    };

    if (challengeId) {
      whereClause.challengeId = challengeId;
    }

    const pendingRewards = await prisma.challengeReward.findMany({
      where: whereClause,
      include: {
        challenge: true,
      },
    });

    if (pendingRewards.length === 0) {
      return NextResponse.json(
        { error: 'No pending rewards to claim' },
        { status: 400 }
      );
    }

    // Calculate total amount being claimed
    const totalAmount = pendingRewards.reduce((sum, r) => sum + r.amount, 0);

    // Group rewards by challenge to update totalRewardsEarned
    const rewardsByChallenge = new Map<string, number>();
    for (const reward of pendingRewards) {
      const current = rewardsByChallenge.get(reward.challengeId) || 0;
      rewardsByChallenge.set(reward.challengeId, current + reward.amount);
    }

    // Mark all pending rewards as paid
    await prisma.challengeReward.updateMany({
      where: {
        id: { in: pendingRewards.map((r) => r.id) },
      },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Update totalRewardsEarned for each challenge
    for (const [chalId, amount] of rewardsByChallenge) {
      await prisma.challenge.update({
        where: { id: chalId },
        data: {
          totalRewardsEarned: {
            increment: amount,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      claimedCount: pendingRewards.length,
      totalAmount,
      message: `Successfully claimed €${totalAmount.toLocaleString()} in rewards!`,
    });
  } catch (error) {
    console.error('Claim rewards error:', error);
    return NextResponse.json(
      { error: 'Failed to claim rewards' },
      { status: 500 }
    );
  }
}

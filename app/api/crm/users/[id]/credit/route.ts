// ==========================================
// USER CREDIT MANAGEMENT API
// ==========================================
// POST - Award free challenge or adjust user credits

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/crm/adminLog';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session } = await requireSuperAdmin();
    const userId = params.id;
    const body = await req.json();
    const { action, tier, difficulty, reason } = body;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'award_challenge') {
      // Award a free challenge to the user
      if (!tier || ![1000, 5000, 10000, 25000, 50000, 100000].includes(tier)) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
      }

      const difficultyLevel = difficulty || 'beginner';
      const minOdds = difficultyLevel === 'pro' ? 2.0 : 1.5;

      // Create the challenge (free - cost = 0)
      const challenge = await prisma.challenge.create({
        data: {
          userId,
          tier,
          difficulty: difficultyLevel,
          minOdds,
          cost: 0, // Free award
          resetFee: tier * 0.5,
          status: 'active',
          currentStreak: 0,
          currentLevel: 1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
        },
      });

      // Log admin action
      await logAdminAction({
        adminId: (session.user as any).id,
        action: 'AWARD_FREE_CHALLENGE',
        targetType: 'USER',
        targetId: userId,
        metadata: {
          challengeId: challenge.id,
          tier,
          difficulty: difficultyLevel,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Awarded free €${tier / 1000}K ${difficultyLevel} challenge to user`,
        challenge,
      });
    }

    if (action === 'reset_challenge') {
      // Reset a user's challenge for free (admin override)
      const { challengeId } = body;

      if (!challengeId) {
        return NextResponse.json({ error: 'Challenge ID required' }, { status: 400 });
      }

      const challenge = await prisma.challenge.findFirst({
        where: { id: challengeId, userId },
      });

      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
      }

      // Reset the challenge
      await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          currentStreak: 0,
          currentLevel: 1,
          status: 'active',
          expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
      });

      // Log admin action
      await logAdminAction({
        adminId: (session.user as any).id,
        action: 'RESET_CHALLENGE_FREE',
        targetType: 'CHALLENGE',
        targetId: challengeId,
        metadata: { userId, reason },
      });

      return NextResponse.json({
        success: true,
        message: 'Challenge reset successfully',
      });
    }

    if (action === 'extend_challenge') {
      // Extend a challenge's expiration
      const { challengeId, days } = body;

      if (!challengeId || !days) {
        return NextResponse.json({ error: 'Challenge ID and days required' }, { status: 400 });
      }

      const challenge = await prisma.challenge.findFirst({
        where: { id: challengeId, userId },
      });

      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
      }

      const newExpiry = new Date(challenge.expiresAt);
      newExpiry.setDate(newExpiry.getDate() + days);

      await prisma.challenge.update({
        where: { id: challengeId },
        data: { expiresAt: newExpiry },
      });

      // Log admin action
      await logAdminAction({
        adminId: (session.user as any).id,
        action: 'EXTEND_CHALLENGE',
        targetType: 'CHALLENGE',
        targetId: challengeId,
        metadata: { userId, days, reason },
      });

      return NextResponse.json({
        success: true,
        message: `Challenge extended by ${days} days`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Super admin')) {
        return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Credit management error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

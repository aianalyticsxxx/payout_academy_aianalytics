// ==========================================
// REJECT REWARD API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/crm/adminLog';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await requireSuperAdmin();
    const adminId = (session.user as any).id;
    const { id: rewardId } = await params;
    const body = await req.json();
    const { reason } = body;

    // Find the reward
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
      include: {
        challenge: {
          include: {
            user: { select: { id: true, username: true, email: true } },
          },
        },
      },
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    if (reward.status !== 'pending') {
      return NextResponse.json(
        { error: `Reward already ${reward.status}` },
        { status: 400 }
      );
    }

    // Update reward status to rejected
    await prisma.reward.update({
      where: { id: rewardId },
      data: {
        status: 'rejected',
        paidAt: new Date(),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'REJECT_REWARD',
      targetType: 'REWARD',
      targetId: rewardId,
      metadata: {
        userId: reward.challenge.userId,
        userEmail: reward.challenge.user.email,
        amount: reward.amount,
        level: reward.level,
        tier: reward.challenge.tier,
        reason: reason || 'No reason provided',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Reward rejected successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Super admin')) {
        return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Reject reward error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

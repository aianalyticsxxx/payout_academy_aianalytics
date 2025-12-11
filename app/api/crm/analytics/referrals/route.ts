// ==========================================
// CRM REFERRAL ANALYTICS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Get all referrals with user info
    const referrals = await prisma.referral.findMany({
      include: {
        referrer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            referralCode: true,
            referralRewards: true,
          },
        },
        referred: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const totalReferrals = referrals.length;
    const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
    const qualifiedReferrals = referrals.filter(r => r.status === 'qualified' || r.status === 'paid').length;
    const totalRewardsEarned = referrals.reduce((sum, r) => sum + r.rewardAmount, 0);
    const pendingPayouts = referrals
      .filter(r => r.status === 'qualified')
      .reduce((sum, r) => sum + r.rewardAmount, 0);

    // Get top referrers
    const topReferrers = await prisma.user.findMany({
      where: { referralRewards: { gt: 0 } },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        referralCode: true,
        referralRewards: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: { referralRewards: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalReferrals,
        pendingReferrals,
        qualifiedReferrals,
        totalRewardsEarned,
        pendingPayouts,
        conversionRate: totalReferrals > 0
          ? ((qualifiedReferrals / totalReferrals) * 100).toFixed(1)
          : '0',
      },
      topReferrers: topReferrers.map(r => ({
        ...r,
        totalReferrals: r._count.referrals,
      })),
      referrals: referrals.map(r => ({
        id: r.id,
        status: r.status,
        rewardAmount: r.rewardAmount,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        paidAt: r.paidAt,
        referrer: {
          id: r.referrer.id,
          username: r.referrer.username,
          email: r.referrer.email,
          avatar: r.referrer.avatar,
        },
        referred: {
          id: r.referred.id,
          username: r.referred.username,
          email: r.referred.email,
          avatar: r.referred.avatar,
          joinedAt: r.referred.createdAt,
        },
      })),
    });

  } catch (error) {
    console.error('Referral analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral analytics' },
      { status: 500 }
    );
  }
}

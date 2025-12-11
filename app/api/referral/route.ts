// ==========================================
// REFERRAL API
// ==========================================
// GET - Get user's referral info and stats
// POST - Apply a referral code during signup

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { nanoid } from 'nanoid';

// Referral reward: 10% of referred user's first purchase
const REFERRAL_REWARD_PERCENT = 0.10;

// Generate a unique referral code
function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

// GET - Get current user's referral info
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        referralCode: true,
        referralRewards: true,
        referredBy: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate referral code if user doesn't have one
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    // Get referral stats
    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: {
        referred: {
          select: {
            username: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter(r => r.status === 'pending').length,
      qualifiedReferrals: referrals.filter(r => r.status === 'qualified' || r.status === 'paid').length,
      totalEarned: user.referralRewards,
      pendingRewards: referrals
        .filter(r => r.status === 'qualified')
        .reduce((sum, r) => sum + r.rewardAmount, 0),
    };

    // Build referral link
    const baseUrl = process.env.NEXTAUTH_URL || 'https://zalogche.com';
    const referralLink = `${baseUrl}/?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralLink,
      stats,
      referrals: referrals.map(r => ({
        id: r.id,
        status: r.status,
        rewardAmount: r.rewardAmount,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        referred: {
          username: r.referred.username || 'Anonymous',
          avatar: r.referred.avatar,
          joinedAt: r.referred.createdAt,
        },
      })),
    });

  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Apply referral code (called during/after signup)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, referredBy: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has a referrer
    if (user.referredBy) {
      return NextResponse.json(
        { error: 'You already have a referral applied' },
        { status: 400 }
      );
    }

    // Check if user signed up more than 24 hours ago
    const hoursSinceSignup = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSignup > 24) {
      return NextResponse.json(
        { error: 'Referral codes can only be applied within 24 hours of signup' },
        { status: 400 }
      );
    }

    // Find the referrer by code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: { id: true, username: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // Can't refer yourself
    if (referrer.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code' },
        { status: 400 }
      );
    }

    // Create the referral record and update user
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { referredBy: referrer.id },
      }),
      prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: user.id,
          status: 'pending',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Referral from ${referrer.username || 'a friend'} applied successfully!`,
    });

  } catch (error) {
    console.error('Apply referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

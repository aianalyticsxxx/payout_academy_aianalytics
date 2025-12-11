// ==========================================
// REFERRAL REWARD PROCESSING
// ==========================================
// Two-sided referral system:
// - Referrer gets 10% of referred user's first purchase
// - Referred user gets 10% discount on first purchase

import { prisma } from '@/lib/db/prisma';

// Referral rewards: 15% for both parties
const REFERRAL_REWARD_PERCENT = 0.15;  // Referrer gets 15% cashback
const REFERRAL_DISCOUNT_PERCENT = 0.15; // Referred user gets 15% off

export async function processReferralReward(
  userId: string,
  challengeId: string,
  purchaseAmount: number
): Promise<{ rewarded: boolean; referrerId?: string; rewardAmount?: number }> {
  try {
    // Check if user was referred
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true },
    });

    if (!user?.referredBy) {
      return { rewarded: false };
    }

    // Check if referral already qualified (first purchase already made)
    const existingReferral = await prisma.referral.findFirst({
      where: {
        referrerId: user.referredBy,
        referredId: userId,
      },
    });

    if (!existingReferral) {
      return { rewarded: false };
    }

    // If already qualified, no additional reward
    if (existingReferral.status !== 'pending') {
      return { rewarded: false };
    }

    // Calculate reward
    const rewardAmount = purchaseAmount * REFERRAL_REWARD_PERCENT;

    // Update referral to qualified and set reward
    await prisma.$transaction([
      prisma.referral.update({
        where: { id: existingReferral.id },
        data: {
          status: 'qualified',
          rewardAmount,
          challengeId,
          qualifiedAt: new Date(),
        },
      }),
      // Update referrer's total rewards
      prisma.user.update({
        where: { id: user.referredBy },
        data: {
          referralRewards: {
            increment: rewardAmount,
          },
        },
      }),
    ]);

    console.log(`[Referral] Awarded €${rewardAmount.toFixed(2)} to referrer ${user.referredBy} for user ${userId}'s first purchase`);

    return {
      rewarded: true,
      referrerId: user.referredBy,
      rewardAmount,
    };

  } catch (error) {
    console.error('[Referral] Error processing referral reward:', error);
    return { rewarded: false };
  }
}

// Check and apply referral code from URL param (called on signup)
export async function applyReferralFromSignup(
  userId: string,
  referralCode: string
): Promise<boolean> {
  try {
    if (!referralCode) return false;

    // Find referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: { id: true },
    });

    if (!referrer || referrer.id === userId) {
      return false;
    }

    // Check if referral already exists
    const existing = await prisma.referral.findUnique({
      where: {
        referrerId_referredId: {
          referrerId: referrer.id,
          referredId: userId,
        },
      },
    });

    if (existing) return false;

    // Create referral
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { referredBy: referrer.id },
      }),
      prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: userId,
          status: 'pending',
        },
      }),
    ]);

    // Give the referred user a discount on first purchase
    await prisma.user.update({
      where: { id: userId },
      data: { referralDiscount: REFERRAL_DISCOUNT_PERCENT },
    });

    console.log(`[Referral] Applied referral code for user ${userId}, they get ${REFERRAL_DISCOUNT_PERCENT * 100}% off first purchase`);

    return true;

  } catch (error) {
    console.error('[Referral] Error applying referral:', error);
    return false;
  }
}

// Get user's referral discount (for checkout)
export async function getUserReferralDiscount(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralDiscount: true },
    });
    return user?.referralDiscount || 0;
  } catch (error) {
    console.error('[Referral] Error getting discount:', error);
    return 0;
  }
}

// Clear user's referral discount after first purchase
export async function clearReferralDiscount(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { referralDiscount: 0 },
    });
  } catch (error) {
    console.error('[Referral] Error clearing discount:', error);
  }
}

// ==========================================
// CHALLENGE SERVICE
// ==========================================

import { prisma } from '@/lib/db/prisma';
import {
  getTierBySize,
  getRewardForLevel,
  LEVEL_REQUIREMENTS,
  CHALLENGE_DURATION_DAYS,
  MAX_ACTIVE_CHALLENGES,
  DifficultyType,
  DIFFICULTY_CONFIG,
  getLevelRequirements,
} from './constants';

// ==========================================
// GET ALL ACTIVE CHALLENGES
// ==========================================

export async function getActiveChallenges(userId: string) {
  return prisma.challenge.findMany({
    where: {
      userId,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
    include: {
      rewards: true,
      bets: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
    orderBy: { purchasedAt: 'desc' },
  });
}

// Keep legacy function for backward compatibility
export async function getActiveChallenge(userId: string) {
  return prisma.challenge.findFirst({
    where: {
      userId,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
    include: {
      rewards: true,
      bets: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

// ==========================================
// COUNT ACTIVE CHALLENGES
// ==========================================

export async function countActiveChallenges(userId: string): Promise<number> {
  return prisma.challenge.count({
    where: {
      userId,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  });
}

// Legacy function for backward compatibility
export async function hasActiveChallenge(userId: string): Promise<boolean> {
  const count = await countActiveChallenges(userId);
  return count > 0;
}

// ==========================================
// CHECK IF CAN CREATE NEW CHALLENGE
// ==========================================

export async function canCreateChallenge(userId: string): Promise<{ canCreate: boolean; currentCount: number; maxAllowed: number }> {
  const currentCount = await countActiveChallenges(userId);
  return {
    canCreate: currentCount < MAX_ACTIVE_CHALLENGES,
    currentCount,
    maxAllowed: MAX_ACTIVE_CHALLENGES,
  };
}

// ==========================================
// CREATE CHALLENGE
// ==========================================

export async function createChallenge(userId: string, tierSize: number, difficulty: DifficultyType = 'beginner') {
  const tier = getTierBySize(tierSize);
  if (!tier) {
    throw new Error(`Invalid tier size: ${tierSize}`);
  }

  // Validate difficulty
  if (!DIFFICULTY_CONFIG[difficulty]) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }

  // Check if user has reached max active challenges
  const { canCreate, currentCount, maxAllowed } = await canCreateChallenge(userId);
  if (!canCreate) {
    throw new Error(`Maximum ${maxAllowed} active challenges allowed. You currently have ${currentCount}.`);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CHALLENGE_DURATION_DAYS);

  return prisma.challenge.create({
    data: {
      userId,
      tier: tier.size,
      cost: tier.cost,
      resetFee: tier.resetFee,
      difficulty,
      minOdds: DIFFICULTY_CONFIG[difficulty].minOdds,
      status: 'active',
      currentStreak: 0,
      currentLevel: 1,
      expiresAt,
    },
  });
}

// ==========================================
// LINK BET TO ALL ACTIVE CHALLENGES
// ==========================================

export async function linkBetToChallenge(betId: string, userId: string) {
  const challenges = await getActiveChallenges(userId);
  if (challenges.length === 0) return [];

  // Get the bet details to check odds
  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    select: { oddsDecimal: true },
  });

  if (!bet) return [];

  const results = [];

  for (const challenge of challenges) {
    // Check if bet is already linked to this challenge
    const existing = await prisma.challengeBet.findFirst({
      where: {
        betId,
        challengeId: challenge.id,
      },
    });

    if (existing) {
      results.push(existing);
      continue;
    }

    // Check if bet meets minimum odds requirement
    if (bet.oddsDecimal < challenge.minOdds) {
      console.log(`Bet ${betId} does not meet minimum odds (${bet.oddsDecimal} < ${challenge.minOdds}) for challenge ${challenge.id}`);
      continue; // Skip this challenge
    }

    const challengeBet = await prisma.challengeBet.create({
      data: {
        challengeId: challenge.id,
        betId,
        streakBefore: challenge.currentStreak,
        levelBefore: challenge.currentLevel,
      },
    });
    results.push(challengeBet);
  }

  return results;
}

// ==========================================
// PROCESS CHALLENGE SETTLEMENT (ALL CHALLENGES)
// ==========================================

export async function processChallengeSettlement(
  betId: string,
  result: 'won' | 'lost' | 'push'
): Promise<{ challengeId: string; streak: number; level: number; levelCompleted: number | null }[] | null> {
  // Find all challenge bets for this bet
  const challengeBets = await prisma.challengeBet.findMany({
    where: { betId },
    include: { challenge: true },
  });

  if (challengeBets.length === 0) return null;

  const results = [];

  for (const challengeBet of challengeBets) {
    if (challengeBet.challenge.status !== 'active') continue;

    const challenge = challengeBet.challenge;
    let newStreak = challenge.currentStreak;
    let newLevel = challenge.currentLevel;
    let levelCompleted: number | null = null;

    // Handle push - no change to streak
    if (result === 'push') {
      await prisma.challengeBet.update({
        where: { id: challengeBet.id },
        data: {
          result,
          streakAfter: newStreak,
          levelAfter: newLevel,
          settledAt: new Date(),
        },
      });
      results.push({ challengeId: challenge.id, streak: newStreak, level: newLevel, levelCompleted: null });
      continue;
    }

    // Handle loss - reset streak
    if (result === 'lost') {
      newStreak = 0;

      await prisma.$transaction([
        prisma.challenge.update({
          where: { id: challenge.id },
          data: { currentStreak: 0 },
        }),
        prisma.challengeBet.update({
          where: { id: challengeBet.id },
          data: {
            result,
            streakAfter: 0,
            levelAfter: newLevel,
            settledAt: new Date(),
          },
        }),
      ]);

      results.push({ challengeId: challenge.id, streak: 0, level: newLevel, levelCompleted: null });
      continue;
    }

    // Handle win - increment streak and check for level completion
    newStreak += 1;

    // Get level requirements based on challenge difficulty
    const levelRequirements = getLevelRequirements(challenge.difficulty as DifficultyType);

    // Check for level completion
    let levelWasCompleted = false;
    for (const levelReq of levelRequirements) {
      if (newStreak === levelReq.streakRequired) {
        const levelField = `level${levelReq.level}Completed` as keyof typeof challenge;
        const isAlreadyCompleted = challenge[levelField];

        if (!isAlreadyCompleted) {
          levelCompleted = levelReq.level;
          newLevel = Math.min(levelReq.level + 1, 4);
          levelWasCompleted = true;

          // Get reward amount
          const rewardAmount = getRewardForLevel(challenge.tier, levelReq.level);

          // Create reward and update challenge in transaction
          await prisma.$transaction([
            prisma.challengeReward.create({
              data: {
                challengeId: challenge.id,
                level: levelReq.level,
                amount: rewardAmount,
                status: 'pending',
              },
            }),
            prisma.challenge.update({
              where: { id: challenge.id },
              data: {
                [`level${levelReq.level}Completed`]: true,
                currentLevel: newLevel,
                currentStreak: newStreak,
                totalRewardsEarned: { increment: rewardAmount },
                ...(levelReq.level === 4
                  ? {
                      status: 'completed',
                      completedAt: new Date(),
                    }
                  : {}),
              },
            }),
            prisma.challengeBet.update({
              where: { id: challengeBet.id },
              data: {
                result,
                streakAfter: newStreak,
                levelAfter: newLevel,
                levelCompleted: levelReq.level,
                settledAt: new Date(),
              },
            }),
          ]);

          results.push({ challengeId: challenge.id, streak: newStreak, level: newLevel, levelCompleted });
        }
        break;
      }
    }

    if (!levelWasCompleted) {
      // No level completed, just update streak
      await prisma.$transaction([
        prisma.challenge.update({
          where: { id: challenge.id },
          data: { currentStreak: newStreak },
        }),
        prisma.challengeBet.update({
          where: { id: challengeBet.id },
          data: {
            result,
            streakAfter: newStreak,
            levelAfter: newLevel,
            settledAt: new Date(),
          },
        }),
      ]);

      results.push({ challengeId: challenge.id, streak: newStreak, level: newLevel, levelCompleted: null });
    }
  }

  return results.length > 0 ? results : null;
}

// ==========================================
// EXPIRE CHALLENGES
// ==========================================

export async function expireChallenges(): Promise<number> {
  const result = await prisma.challenge.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'expired',
    },
  });
  return result.count;
}

// ==========================================
// RESET CHALLENGE
// ==========================================

export async function resetChallenge(challengeId: string, userId: string) {
  const challenge = await prisma.challenge.findFirst({
    where: {
      id: challengeId,
      userId,
      status: 'expired',
    },
  });

  if (!challenge) {
    throw new Error('Challenge not found or not eligible for reset');
  }

  // Check if user would exceed max after reset
  const { canCreate, currentCount, maxAllowed } = await canCreateChallenge(userId);
  if (!canCreate) {
    throw new Error(`Maximum ${maxAllowed} active challenges allowed. You currently have ${currentCount}.`);
  }

  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + CHALLENGE_DURATION_DAYS);

  return prisma.challenge.update({
    where: { id: challengeId },
    data: {
      status: 'active',
      currentStreak: 0, // Reset streak, keep completed levels
      expiresAt: newExpiresAt,
    },
  });
}

// ==========================================
// GET CHALLENGE BY ID
// ==========================================

export async function getChallengeById(challengeId: string, userId: string) {
  return prisma.challenge.findFirst({
    where: {
      id: challengeId,
      userId,
    },
    include: {
      rewards: {
        orderBy: { level: 'asc' },
      },
      bets: {
        orderBy: { createdAt: 'desc' },
        include: {
          bet: {
            select: {
              sport: true,
              matchup: true,
              selection: true,
              odds: true,
              stake: true,
              result: true,
              settledAt: true,
            },
          },
        },
      },
    },
  });
}

// ==========================================
// GET USER CHALLENGE HISTORY
// ==========================================

export async function getChallengeHistory(userId: string, limit = 10) {
  return prisma.challenge.findMany({
    where: { userId },
    orderBy: { purchasedAt: 'desc' },
    take: limit,
    include: {
      rewards: true,
    },
  });
}

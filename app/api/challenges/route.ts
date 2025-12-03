// ==========================================
// CHALLENGES API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  getActiveChallenges,
  createChallenge,
  getChallengeHistory,
  canCreateChallenge,
} from '@/lib/challenges/challenge-service';
import {
  getTierBySize,
  CHALLENGE_TIERS,
  LEVEL_REQUIREMENTS,
  getNextLevelTarget,
  MAX_ACTIVE_CHALLENGES,
} from '@/lib/challenges/constants';
import { z } from 'zod';

// ==========================================
// VALIDATION
// ==========================================

const CreateChallengeSchema = z.object({
  tier: z.number().refine(
    (val) => CHALLENGE_TIERS.some((t) => t.size === val),
    { message: 'Invalid tier size' }
  ),
});

// ==========================================
// GET - Get user's active challenges (up to 5)
// ==========================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const includeHistory = searchParams.get('history') === 'true';

    // Get all active challenges
    const activeChallenges = await getActiveChallenges(userId);

    // Calculate additional stats for each challenge
    const challengesData = activeChallenges.map((challenge) => {
      const tier = getTierBySize(challenge.tier);
      const nextTarget = getNextLevelTarget(challenge.currentStreak);
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (challenge.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      );

      return {
        ...challenge,
        tierLabel: tier?.label || `$${challenge.tier / 1000}K`,
        tierRewards: tier?.rewards || [],
        daysRemaining,
        nextLevelTarget: nextTarget,
        levelRequirements: LEVEL_REQUIREMENTS,
        completedLevels: [
          challenge.level1Completed,
          challenge.level2Completed,
          challenge.level3Completed,
          challenge.level4Completed,
        ].filter(Boolean).length,
      };
    });

    // Check if user can create more challenges
    const createStatus = await canCreateChallenge(userId);

    // Optionally include history
    let history = null;
    if (includeHistory) {
      history = await getChallengeHistory(userId);
    }

    return NextResponse.json({
      challenges: challengesData,
      // Keep backward compatibility
      challenge: challengesData[0] || null,
      canCreateMore: createStatus.canCreate,
      currentCount: createStatus.currentCount,
      maxAllowed: createStatus.maxAllowed,
      history,
      tiers: CHALLENGE_TIERS,
      levels: LEVEL_REQUIREMENTS,
    });
  } catch (error) {
    console.error('Get challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST - Create new challenge (purchase)
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Validate input
    const result = CreateChallengeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.errors },
        { status: 400 }
      );
    }

    const { tier } = result.data;

    // Create the challenge
    const challenge = await createChallenge(userId, tier);

    const tierData = getTierBySize(tier);

    return NextResponse.json(
      {
        challenge,
        message: `${tierData?.label || '$' + tier / 1000 + 'K'} Challenge created successfully!`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create challenge error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Maximum') && error.message.includes('active challenges')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes('Invalid tier')) {
        return NextResponse.json(
          { error: 'Invalid challenge tier' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
}

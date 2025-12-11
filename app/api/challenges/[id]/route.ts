// ==========================================
// CHALLENGE DETAILS API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getChallengeById } from '@/lib/challenges/challenge-service';
import { getTierBySize, LEVEL_REQUIREMENTS } from '@/lib/challenges/constants';

// ==========================================
// GET - Get specific challenge details
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: challengeId } = await params;

    const challenge = await getChallengeById(challengeId, userId);

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    const tier = getTierBySize(challenge.tier);
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (challenge.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );

    return NextResponse.json({
      challenge: {
        ...challenge,
        tierLabel: tier?.label || `$${challenge.tier / 1000}K`,
        tierRewards: tier?.rewards || [],
        daysRemaining,
        levelRequirements: LEVEL_REQUIREMENTS,
        completedLevels: [
          challenge.level1Completed,
          challenge.level2Completed,
          challenge.level3Completed,
          challenge.level4Completed,
        ].filter(Boolean).length,
      },
    });
  } catch (error) {
    console.error('Get challenge details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge details' },
      { status: 500 }
    );
  }
}

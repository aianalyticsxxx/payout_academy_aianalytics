// ==========================================
// CHALLENGE RESET API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { resetChallenge } from '@/lib/challenges/challenge-service';
import { getTierBySize } from '@/lib/challenges/constants';

// ==========================================
// POST - Reset expired challenge
// ==========================================

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const challengeId = params.id;

    // Reset the challenge
    const challenge = await resetChallenge(challengeId, userId);

    const tier = getTierBySize(challenge.tier);

    return NextResponse.json({
      challenge,
      message: `${tier?.label || '$' + challenge.tier / 1000 + 'K'} Challenge reset successfully! You have 45 more days.`,
    });
  } catch (error) {
    console.error('Reset challenge error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('not eligible')) {
        return NextResponse.json(
          { error: 'Challenge not found or not eligible for reset' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to reset challenge' },
      { status: 500 }
    );
  }
}

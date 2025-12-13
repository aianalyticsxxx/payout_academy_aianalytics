// ==========================================
// BETS CRUD API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { linkBetToChallenge, processChallengeSettlement, getActiveChallenges } from '@/lib/challenges/challenge-service';
import { safePagination, paginationMeta } from '@/lib/security/pagination';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

// SECURITY: Safe integer limits to prevent overflow attacks
const MAX_SAFE_STAKE = 1000000; // €1M max stake (well within Number.MAX_SAFE_INTEGER)
const MIN_STAKE = 0.01; // Minimum €0.01 stake

const CreateBetSchema = z.object({
  sport: z.string().min(1).max(100),
  league: z.string().max(200).optional(),
  matchup: z.string().min(1).max(500),
  betType: z.string().min(1).max(100),
  selection: z.string().min(1).max(500),
  odds: z.string().min(1).max(20),
  stake: z.number()
    .min(MIN_STAKE, `Minimum stake is €${MIN_STAKE}`)
    .max(MAX_SAFE_STAKE, `Maximum stake is €${MAX_SAFE_STAKE.toLocaleString()}`)
    .refine(
      (val) => Number.isFinite(val) && val <= Number.MAX_SAFE_INTEGER,
      'Invalid stake amount'
    ),
  eventId: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(), // Limit notes to 1000 chars
  challengeIds: z.array(z.string()).max(10).optional(), // Max 10 challenges per bet
});

const UpdateBetSchema = z.object({
  id: z.string(),
  result: z.enum(['pending', 'won', 'lost', 'push']).optional(),
  notes: z.string().max(1000).optional(), // Limit notes to 1000 chars
});

// ==========================================
// HELPERS
// ==========================================

function parseDecimalOdds(odds: string): number {
  const numOdds = parseFloat(odds);
  if (isNaN(numOdds) || numOdds < 1) return 2.0;
  return numOdds;
}

function calculateProfitLoss(
  stake: number,
  oddsDecimal: number,
  result: string
): number | null {
  if (result === 'pending') return null;
  if (result === 'push') return 0;
  if (result === 'won') return stake * (oddsDecimal - 1);
  if (result === 'lost') return -stake;
  return null;
}

async function updateUserLeaderboard(userId: string) {
  const bets = await prisma.bet.findMany({
    where: { userId, result: { not: 'pending' } },
  });

  const wins = bets.filter(b => b.result === 'won').length;
  const losses = bets.filter(b => b.result === 'lost').length;
  const pushes = bets.filter(b => b.result === 'push').length;
  const totalProfit = bets.reduce((sum, b) => sum + (b.profitLoss || 0), 0);
  const totalStaked = bets
    .filter(b => b.result !== 'push')
    .reduce((sum, b) => sum + b.stake, 0);

  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

  // Calculate streak
  const sortedBets = [...bets].sort(
    (a, b) => new Date(b.settledAt || b.createdAt).getTime() - 
              new Date(a.settledAt || a.createdAt).getTime()
  );
  
  let currentStreak = 0;
  for (const bet of sortedBets) {
    if (bet.result === 'push') continue;
    if (currentStreak === 0) {
      currentStreak = bet.result === 'won' ? 1 : -1;
    } else if (
      (currentStreak > 0 && bet.result === 'won') ||
      (currentStreak < 0 && bet.result === 'lost')
    ) {
      currentStreak += currentStreak > 0 ? 1 : -1;
    } else {
      break;
    }
  }

  // Determine tier
  let tier = 'Bronze';
  if (wins >= 100 && winRate >= 60 && roi >= 15) tier = 'Diamond';
  else if (wins >= 75 && winRate >= 57 && roi >= 10) tier = 'Platinum';
  else if (wins >= 50 && winRate >= 55 && roi >= 5) tier = 'Gold';
  else if (wins >= 25 && winRate >= 52) tier = 'Silver';

  await prisma.globalLeaderboard.upsert({
    where: { userId },
    create: {
      userId,
      wins,
      losses,
      pushes,
      totalBets: wins + losses + pushes,
      totalProfit,
      totalStaked,
      roi,
      winRate,
      currentStreak,
      tier,
    },
    update: {
      wins,
      losses,
      pushes,
      totalBets: wins + losses + pushes,
      totalProfit,
      totalStaked,
      roi,
      winRate,
      currentStreak,
      tier,
    },
  });

  // Update user tier
  await prisma.user.update({
    where: { id: userId },
    data: { tier },
  });
}

// ==========================================
// GET - List bets
// ==========================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const searchParams = req.nextUrl.searchParams;

    const result = searchParams.get('result');
    const sport = searchParams.get('sport');

    // Use safe pagination with bounds checking
    const { limit, offset } = safePagination(searchParams);

    const bets = await prisma.bet.findMany({
      where: {
        userId,
        ...(result && { result }),
        ...(sport && { sport }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.bet.count({
      where: {
        userId,
        ...(result && { result }),
        ...(sport && { sport }),
      },
    });

    return NextResponse.json({
      bets,
      ...paginationMeta(total, { limit, offset }),
    });
    
  } catch (error) {
    console.error('Get bets error:', error);
    return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 });
  }
}

// ==========================================
// POST - Create bet
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const data = CreateBetSchema.parse(body);

    const oddsDecimal = parseDecimalOdds(data.odds);

    // Get active challenges
    const activeChallenges = await getActiveChallenges(userId);

    // Determine which challenges to link to
    let selectedChallenges = activeChallenges;
    if (data.challengeIds && data.challengeIds.length > 0) {
      // User specified which challenges to link to
      selectedChallenges = activeChallenges.filter(c => data.challengeIds!.includes(c.id));
    }

    // Validate minimum odds for selected challenges
    if (selectedChallenges.length > 0) {
      for (const challenge of selectedChallenges) {
        if (oddsDecimal < challenge.minOdds) {
          const difficultyName = challenge.difficulty === 'pro' ? 'Pro' : 'Beginner';
          return NextResponse.json(
            {
              error: `Odds too low for challenge`,
              message: `Your €${challenge.tier.toLocaleString()} ${difficultyName} challenge requires minimum odds of ${challenge.minOdds.toFixed(2)}. Current odds: ${oddsDecimal.toFixed(2)}`
            },
            { status: 400 }
          );
        }
      }
    }

    const bet = await prisma.bet.create({
      data: {
        userId,
        sport: data.sport,
        league: data.league,
        matchup: data.matchup,
        betType: data.betType,
        selection: data.selection,
        odds: data.odds,
        oddsDecimal,
        stake: data.stake,
        eventId: data.eventId,
        notes: data.notes,
        result: 'pending',
      },
    });

    // Link to selected challenges only
    if (selectedChallenges.length > 0) {
      for (const challenge of selectedChallenges) {
        // Check if bet meets minimum odds for this challenge
        if (oddsDecimal >= challenge.minOdds) {
          await prisma.challengeBet.create({
            data: {
              challengeId: challenge.id,
              betId: bet.id,
              streakBefore: challenge.currentStreak,
              levelBefore: challenge.currentLevel,
            },
          });
        }
      }
    }

    return NextResponse.json(bet, { status: 201 });
    
  } catch (error) {
    console.error('Create bet error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid bet data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: 'Failed to create bet' }, { status: 500 });
  }
}

// ==========================================
// PATCH - Update bet (settle)
// ==========================================

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, result, notes } = UpdateBetSchema.parse(body);

    // Verify ownership
    const existingBet = await prisma.bet.findFirst({
      where: { id, userId },
    });

    if (!existingBet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    }

    // Calculate profit/loss if settling
    let profitLoss = existingBet.profitLoss;
    let settledAt = existingBet.settledAt;
    
    if (result && result !== 'pending') {
      profitLoss = calculateProfitLoss(
        existingBet.stake,
        existingBet.oddsDecimal,
        result
      );
      settledAt = new Date();
    }

    const bet = await prisma.bet.update({
      where: { id },
      data: {
        ...(result && { result }),
        ...(notes !== undefined && { notes }),
        profitLoss,
        settledAt,
      },
    });

    // Update leaderboard and process challenge if settled
    if (result && result !== 'pending') {
      await updateUserLeaderboard(userId);

      // Process challenge streak update for all active challenges
      const challengeResults = await processChallengeSettlement(
        id,
        result as 'won' | 'lost' | 'push'
      );
      if (challengeResults && challengeResults.length > 0) {
        for (const cr of challengeResults) {
          if (cr.levelCompleted) {
            console.log(`[Bet] User completed challenge level ${cr.levelCompleted} on challenge ${cr.challengeId}`);
          }
        }
      }
    }

    return NextResponse.json(bet);

  } catch (error) {
    console.error('Update bet error:', error);
    return NextResponse.json({ error: 'Failed to update bet' }, { status: 500 });
  }
}

// ==========================================
// DELETE - Delete bet
// ==========================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bet ID required' }, { status: 400 });
    }

    // Verify ownership
    const existingBet = await prisma.bet.findFirst({
      where: { id, userId },
    });

    if (!existingBet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    }

    await prisma.bet.delete({ where: { id } });

    // Update leaderboard
    await updateUserLeaderboard(userId);

    return NextResponse.json({ message: 'Bet deleted' });
    
  } catch (error) {
    console.error('Delete bet error:', error);
    return NextResponse.json({ error: 'Failed to delete bet' }, { status: 500 });
  }
}

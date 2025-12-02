// ==========================================
// BETS CRUD API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const CreateBetSchema = z.object({
  sport: z.string().min(1),
  league: z.string().optional(),
  matchup: z.string().min(1),
  betType: z.string().min(1),
  selection: z.string().min(1),
  odds: z.string().min(1),
  stake: z.number().positive(),
  eventId: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateBetSchema = z.object({
  id: z.string(),
  result: z.enum(['pending', 'won', 'lost', 'push']).optional(),
  notes: z.string().optional(),
});

// ==========================================
// HELPERS
// ==========================================

function convertOddsToDecimal(odds: string): number {
  const numOdds = parseFloat(odds.replace('+', ''));
  if (isNaN(numOdds)) return 2.0;
  
  if (numOdds > 0) {
    return (numOdds / 100) + 1;
  } else {
    return (100 / Math.abs(numOdds)) + 1;
  }
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
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

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
      total,
      limit,
      offset,
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

    const oddsDecimal = convertOddsToDecimal(data.odds);

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

    // Update leaderboard if settled
    if (result && result !== 'pending') {
      await updateUserLeaderboard(userId);
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

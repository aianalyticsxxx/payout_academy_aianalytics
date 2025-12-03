// ==========================================
// PARLAYS CRUD API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const ParlayLegSchema = z.object({
  eventId: z.string().optional(),
  sport: z.string().min(1),
  league: z.string().optional(),
  matchup: z.string().min(1),
  betType: z.string().min(1),
  selection: z.string().min(1),
  odds: z.string().min(1),
});

const CreateParlaySchema = z.object({
  stake: z.number().positive(),
  legs: z.array(ParlayLegSchema).min(2, 'Parlay must have at least 2 legs'),
  notes: z.string().optional(),
});

const UpdateParlaySchema = z.object({
  id: z.string(),
  result: z.enum(['pending', 'won', 'lost', 'push']).optional(),
  notes: z.string().optional(),
});

const UpdateLegSchema = z.object({
  parlayId: z.string(),
  legId: z.string(),
  result: z.enum(['pending', 'won', 'lost', 'push']),
});

// ==========================================
// HELPERS
// ==========================================

function convertOddsToDecimal(odds: string): number {
  const numOdds = parseFloat(odds.replace('+', ''));
  if (isNaN(numOdds)) return 2.0;

  // Check if already decimal odds (contains decimal point and value > 1)
  if (odds.includes('.') && numOdds > 1 && numOdds < 100) {
    return numOdds;
  }

  // American odds
  if (numOdds > 0) {
    return (numOdds / 100) + 1;
  } else {
    return (100 / Math.abs(numOdds)) + 1;
  }
}

function calculateParlayOdds(legs: { oddsDecimal: number }[]): number {
  return legs.reduce((acc, leg) => acc * leg.oddsDecimal, 1);
}

function determineParlayResult(
  legs: { result: string }[]
): 'pending' | 'won' | 'lost' | 'push' {
  // If any leg is pending, parlay is pending
  if (legs.some(l => l.result === 'pending')) return 'pending';

  // If any leg is lost, parlay is lost
  if (legs.some(l => l.result === 'lost')) return 'lost';

  // If all legs are pushes, parlay is push
  if (legs.every(l => l.result === 'push')) return 'push';

  // Calculate effective odds for won/push mix
  // If some legs are push and others are won, it's still a win but with adjusted odds
  if (legs.every(l => l.result === 'won' || l.result === 'push')) return 'won';

  return 'pending';
}

function calculateParlayProfitLoss(
  stake: number,
  legs: { oddsDecimal: number; result: string }[],
  result: string
): number | null {
  if (result === 'pending') return null;
  if (result === 'lost') return -stake;

  // For won or push with some legs pushed
  const effectiveLegs = legs.filter(l => l.result === 'won');
  const pushedLegs = legs.filter(l => l.result === 'push');

  if (effectiveLegs.length === 0 && pushedLegs.length > 0) {
    // All legs pushed - return stake
    return 0;
  }

  // Calculate effective odds (only multiply won legs)
  const effectiveOdds = effectiveLegs.reduce((acc, leg) => acc * leg.oddsDecimal, 1);
  return stake * (effectiveOdds - 1);
}

// ==========================================
// GET - List parlays
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const parlays = await prisma.parlay.findMany({
      where: {
        userId,
        ...(result && { result }),
      },
      include: {
        legs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.parlay.count({
      where: {
        userId,
        ...(result && { result }),
      },
    });

    return NextResponse.json({
      parlays,
      total,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Get parlays error:', error);
    return NextResponse.json({ error: 'Failed to fetch parlays' }, { status: 500 });
  }
}

// ==========================================
// POST - Create parlay
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const data = CreateParlaySchema.parse(body);

    // Convert odds and calculate total odds
    const legsWithDecimal = data.legs.map(leg => ({
      ...leg,
      oddsDecimal: convertOddsToDecimal(leg.odds),
    }));

    const totalOdds = calculateParlayOdds(legsWithDecimal);

    // Create parlay with legs
    const parlay = await prisma.parlay.create({
      data: {
        userId,
        stake: data.stake,
        totalOdds,
        notes: data.notes,
        result: 'pending',
        legs: {
          create: legsWithDecimal.map(leg => ({
            eventId: leg.eventId,
            sport: leg.sport,
            league: leg.league,
            matchup: leg.matchup,
            betType: leg.betType,
            selection: leg.selection,
            odds: leg.odds,
            oddsDecimal: leg.oddsDecimal,
            result: 'pending',
          })),
        },
      },
      include: {
        legs: true,
      },
    });

    return NextResponse.json(parlay, { status: 201 });

  } catch (error) {
    console.error('Create parlay error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parlay data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create parlay' }, { status: 500 });
  }
}

// ==========================================
// PATCH - Update parlay leg or settle parlay
// ==========================================

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Check if this is a leg update or parlay update
    if (body.legId) {
      // Update individual leg
      const { parlayId, legId, result } = UpdateLegSchema.parse(body);

      // Verify ownership
      const parlay = await prisma.parlay.findFirst({
        where: { id: parlayId, userId },
        include: { legs: true },
      });

      if (!parlay) {
        return NextResponse.json({ error: 'Parlay not found' }, { status: 404 });
      }

      // Update the leg
      await prisma.parlayLeg.update({
        where: { id: legId },
        data: { result },
      });

      // Refetch parlay with updated legs
      const updatedParlay = await prisma.parlay.findUnique({
        where: { id: parlayId },
        include: { legs: true },
      });

      if (!updatedParlay) {
        return NextResponse.json({ error: 'Parlay not found' }, { status: 404 });
      }

      // Check if parlay should be auto-settled
      const parlayResult = determineParlayResult(updatedParlay.legs);

      if (parlayResult !== 'pending') {
        const profitLoss = calculateParlayProfitLoss(
          updatedParlay.stake,
          updatedParlay.legs.map(l => ({ oddsDecimal: l.oddsDecimal, result: l.result })),
          parlayResult
        );

        await prisma.parlay.update({
          where: { id: parlayId },
          data: {
            result: parlayResult,
            profitLoss,
            settledAt: new Date(),
          },
        });
      }

      // Return updated parlay
      const finalParlay = await prisma.parlay.findUnique({
        where: { id: parlayId },
        include: { legs: true },
      });

      return NextResponse.json(finalParlay);

    } else {
      // Update parlay directly
      const { id, result, notes } = UpdateParlaySchema.parse(body);

      // Verify ownership
      const existingParlay = await prisma.parlay.findFirst({
        where: { id, userId },
        include: { legs: true },
      });

      if (!existingParlay) {
        return NextResponse.json({ error: 'Parlay not found' }, { status: 404 });
      }

      let profitLoss = existingParlay.profitLoss;
      let settledAt = existingParlay.settledAt;

      if (result && result !== 'pending') {
        profitLoss = calculateParlayProfitLoss(
          existingParlay.stake,
          existingParlay.legs.map(l => ({ oddsDecimal: l.oddsDecimal, result: l.result })),
          result
        );
        settledAt = new Date();

        // Also update all pending legs to match
        if (result === 'lost') {
          await prisma.parlayLeg.updateMany({
            where: { parlayId: id, result: 'pending' },
            data: { result: 'lost' },
          });
        } else if (result === 'won') {
          await prisma.parlayLeg.updateMany({
            where: { parlayId: id, result: 'pending' },
            data: { result: 'won' },
          });
        }
      }

      const parlay = await prisma.parlay.update({
        where: { id },
        data: {
          ...(result && { result }),
          ...(notes !== undefined && { notes }),
          profitLoss,
          settledAt,
        },
        include: { legs: true },
      });

      return NextResponse.json(parlay);
    }

  } catch (error) {
    console.error('Update parlay error:', error);
    return NextResponse.json({ error: 'Failed to update parlay' }, { status: 500 });
  }
}

// ==========================================
// DELETE - Delete parlay
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
      return NextResponse.json({ error: 'Parlay ID required' }, { status: 400 });
    }

    // Verify ownership
    const existingParlay = await prisma.parlay.findFirst({
      where: { id, userId },
    });

    if (!existingParlay) {
      return NextResponse.json({ error: 'Parlay not found' }, { status: 404 });
    }

    // Cascade delete will handle legs
    await prisma.parlay.delete({ where: { id } });

    return NextResponse.json({ message: 'Parlay deleted' });

  } catch (error) {
    console.error('Delete parlay error:', error);
    return NextResponse.json({ error: 'Failed to delete parlay' }, { status: 500 });
  }
}

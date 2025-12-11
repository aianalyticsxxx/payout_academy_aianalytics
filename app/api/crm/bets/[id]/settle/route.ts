// ==========================================
// MANUAL BET SETTLEMENT API
// ==========================================
// POST - Manually settle a pending bet

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/crm/adminLog';
import { processChallengeSettlement } from '@/lib/challenges/challenge-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await requireAdmin();
    const { id: betId } = await params;
    const body = await req.json();
    const { result, reason } = body;

    // Validate result
    if (!result || !['won', 'lost', 'push', 'void'].includes(result)) {
      return NextResponse.json(
        { error: 'Invalid result. Must be: won, lost, push, or void' },
        { status: 400 }
      );
    }

    // Find the bet
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    if (!bet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    }

    if (bet.result !== 'pending') {
      return NextResponse.json(
        { error: `Bet already settled as: ${bet.result}` },
        { status: 400 }
      );
    }

    // Calculate profit/loss
    let profitLoss = 0;
    if (result === 'won') {
      profitLoss = bet.stake * (bet.oddsDecimal - 1);
    } else if (result === 'lost') {
      profitLoss = -bet.stake;
    } else if (result === 'void') {
      profitLoss = 0; // Stake returned
    }
    // push = 0 profit/loss

    // Update the bet
    await prisma.bet.update({
      where: { id: betId },
      data: {
        result: result === 'void' ? 'push' : result, // Treat void as push
        profitLoss,
        settledAt: new Date(),
      },
    });

    // Update user leaderboard stats
    await updateUserStats(bet.userId);

    // Process challenge settlement if applicable
    if (result !== 'void') {
      const challengeResults = await processChallengeSettlement(betId, result);
      if (challengeResults && challengeResults.length > 0) {
        for (const cr of challengeResults) {
          if (cr.levelCompleted) {
            console.log(`[Manual Settle] User completed challenge level ${cr.levelCompleted}`);
          }
        }
      }
    }

    // Log admin action with specific action type
    await logAdminAction({
      adminId: (session.user as any).id,
      action: result === 'void' ? 'VOID_BET' : 'SETTLE_BET',
      targetType: 'BET',
      targetId: betId,
      metadata: {
        userId: bet.userId,
        result,
        profitLoss,
        reason,
        matchup: bet.matchup,
        selection: bet.selection,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bet settled as ${result}`,
      bet: {
        id: betId,
        result: result === 'void' ? 'push' : result,
        profitLoss,
      },
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Manual settlement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update user's leaderboard stats after settlement
async function updateUserStats(userId: string) {
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

  const winRate = (wins + losses) > 0 ? wins / (wins + losses) : 0;
  const roi = totalStaked > 0 ? totalProfit / totalStaked : 0;

  // Calculate tier
  let tier = 'Bronze';
  if (wins >= 100 && winRate >= 0.60 && roi >= 0.15) tier = 'Diamond';
  else if (wins >= 75 && winRate >= 0.57 && roi >= 0.10) tier = 'Platinum';
  else if (wins >= 50 && winRate >= 0.55 && roi >= 0.05) tier = 'Gold';
  else if (wins >= 25 && winRate >= 0.52) tier = 'Silver';

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
      tier,
    },
  });
}

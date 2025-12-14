// ==========================================
// CRON: UPDATE LEADERBOARD RANKS
// ==========================================
// Runs hourly via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Verify cron secret with timing-safe comparison
function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');

  // DENY by default if no secret configured (security first)
  if (!process.env.CRON_SECRET) {
    console.error('[Cron] CRON_SECRET not configured - denying access');
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader.length !== expected.length) {
    return false;
  }

  // Constant-time comparison
  const { timingSafeEqual } = require('crypto');
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Recalculating leaderboard ranks...');

    // Get all users with enough bets
    const users = await prisma.globalLeaderboard.findMany({
      where: {
        totalBets: { gte: 10 },
      },
      orderBy: [
        { roi: 'desc' },
        { winRate: 'desc' },
        { wins: 'desc' },
      ],
    });

    // Update ranks
    for (let i = 0; i < users.length; i++) {
      await prisma.globalLeaderboard.update({
        where: { userId: users[i].userId },
        data: { rank: i + 1 },
      });
    }

    // Clear ranks for users with < 10 bets
    await prisma.globalLeaderboard.updateMany({
      where: {
        totalBets: { lt: 10 },
      },
      data: {
        rank: null,
      },
    });

    console.log(`[Cron] Updated ranks for ${users.length} users`);

    return NextResponse.json({
      message: 'Leaderboard updated',
      usersRanked: users.length,
    });
    
  } catch (error) {
    console.error('[Cron] Leaderboard update error:', error);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    );
  }
}

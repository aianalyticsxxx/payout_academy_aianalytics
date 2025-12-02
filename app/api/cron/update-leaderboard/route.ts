// ==========================================
// CRON: UPDATE LEADERBOARD RANKS
// ==========================================
// Runs hourly via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
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

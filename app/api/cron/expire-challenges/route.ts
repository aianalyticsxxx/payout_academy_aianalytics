// ==========================================
// EXPIRE CHALLENGES CRON JOB
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { expireChallenges } from '@/lib/challenges/challenge-service';

// ==========================================
// GET - Expire old challenges (Cron Job)
// ==========================================

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret in production
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow in development or if no secret is set
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[Cron] Starting challenge expiry check...');

    const expiredCount = await expireChallenges();

    console.log(`[Cron] Expired ${expiredCount} challenges`);

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Expire challenges error:', error);
    return NextResponse.json(
      { error: 'Failed to expire challenges' },
      { status: 500 }
    );
  }
}

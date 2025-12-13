// ==========================================
// EXPIRE CHALLENGES CRON JOB
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { expireChallenges } from '@/lib/challenges/challenge-service';
import { timingSafeEqual } from 'crypto';

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

  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ==========================================
// GET - Expire old challenges (Cron Job)
// ==========================================

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

// ==========================================
// PENDING REWARDS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { getPendingRewards } from '@/lib/crm/analytics';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const rewards = await getPendingRewards();

    return NextResponse.json({ rewards });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Pending rewards API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

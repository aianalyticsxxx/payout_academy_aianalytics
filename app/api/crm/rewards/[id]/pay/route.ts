// ==========================================
// MARK REWARD AS PAID API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { markRewardAsPaid } from '@/lib/crm/analytics';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session } = await requireAdmin();
    const adminId = (session.user as any).id;
    const { id } = params;

    const reward = await markRewardAsPaid(id, adminId);

    return NextResponse.json({
      success: true,
      reward,
      message: 'Reward marked as paid successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Mark reward paid error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

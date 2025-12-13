// ==========================================
// CRM USERS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { getUserAnalytics } from '@/lib/crm/analytics';
import { safePagePagination } from '@/lib/security/pagination';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const { limit, page } = safePagePagination(searchParams); // Bounded pagination
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const hasChallenge = searchParams.get('hasChallenge') === 'true';

    const result = await getUserAnalytics({
      page,
      limit,
      search,
      tier,
      difficulty,
      hasChallenge,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

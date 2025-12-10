// ==========================================
// CRM DASHBOARD ANALYTICS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { getDashboardMetrics } from '@/lib/crm/analytics';
import { crmCache, CacheKeys, CacheTTL } from '@/lib/crm/cache';
import { logAdminAction } from '@/lib/crm/adminLog';

export async function GET(req: NextRequest) {
  try {
    // Require admin access
    const { session } = await requireAdmin();

    // Get period from query params (default 30d)
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';

    // Log admin action
    await logAdminAction({
      adminId: (session.user as any).id,
      action: 'VIEW_DASHBOARD',
      metadata: { period },
    });

    // Fetch dashboard metrics with caching
    const metrics = await crmCache.getOrFetch(
      CacheKeys.dashboard(period),
      () => getDashboardMetrics(period),
      CacheTTL.DASHBOARD
    );

    return NextResponse.json(metrics);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Dashboard metrics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

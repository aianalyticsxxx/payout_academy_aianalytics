// ==========================================
// REVENUE ANALYTICS PAGE
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { CRMPageHeader } from '@/components/crm/CRMPageHeader';

interface TierData {
  revenue: number;
  count: number;
  beginner: { revenue: number; count: number };
  pro: { revenue: number; count: number };
}

interface RevenueAnalytics {
  summary: {
    periodRevenue: number;
    periodCount: number;
    mtdRevenue: number;
    ytdRevenue: number;
    allTimeRevenue: number;
    pendingRewards: number;
    pendingRewardsCount: number;
    paidRewards: number;
    paidRewardsCount: number;
    arpu: number;
    totalUsers: number;
    payingUsers: number;
    conversionRate: number;
  };
  tierRevenue: Record<number, TierData>;
  difficultyRevenue: {
    beginner: { revenue: number; count: number };
    pro: { revenue: number; count: number };
  };
  dailyRevenue: Array<{ date: string; revenue: number; count: number }>;
  topUsers: Array<{
    id: string;
    username: string | null;
    email: string | null;
    totalSpent: number;
    challengeCount: number;
  }>;
  recentPurchases: any[];
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/revenue?period=${period}`);
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const tierConfig: Record<number, { label: string; icon: string; color: string; gradient: string }> = {
    1000: { label: '€1K', icon: '🌱', color: 'text-emerald-400', gradient: 'from-emerald-600 to-emerald-400' },
    5000: { label: '€5K', icon: '🎯', color: 'text-teal-400', gradient: 'from-teal-600 to-teal-400' },
    10000: { label: '€10K', icon: '⭐', color: 'text-cyan-400', gradient: 'from-cyan-600 to-cyan-400' },
    25000: { label: '€25K', icon: '💎', color: 'text-blue-400', gradient: 'from-blue-600 to-blue-400' },
    50000: { label: '€50K', icon: '👑', color: 'text-violet-400', gradient: 'from-violet-600 to-violet-400' },
    100000: { label: '€100K', icon: '🏆', color: 'text-amber-400', gradient: 'from-amber-600 to-amber-400' },
  };

  const topUsersColumns = [
    {
      key: 'username',
      label: 'User',
      render: (username: string | null, row: any) => (
        <div>
          <div className="text-white font-medium">{username || 'No username'}</div>
          <div className="text-xs text-zinc-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      render: (amount: number) => (
        <span className="text-green-400 font-bold">{formatCurrency(amount)}</span>
      ),
    },
    {
      key: 'challengeCount',
      label: 'Challenges',
      render: (count: number) => (
        <span className="text-zinc-300">{count}</span>
      ),
    },
  ];

  const recentColumns = [
    {
      key: 'user',
      label: 'User',
      render: (user: any) => (
        <div>
          <div className="text-white font-medium">{user?.username || 'No username'}</div>
          <div className="text-xs text-zinc-500">{user?.email}</div>
        </div>
      ),
    },
    {
      key: 'tier',
      label: 'Challenge',
      render: (tier: number, row: any) => (
        <div className="flex items-center gap-2">
          <span>{tierConfig[tier]?.icon || '📊'}</span>
          <span className={tierConfig[tier]?.color || 'text-zinc-300'}>
            {tierConfig[tier]?.label || `${tier / 1000}K`}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            row.difficulty === 'pro' ? 'bg-orange-900/30 text-orange-400' : 'bg-green-900/30 text-green-400'
          }`}>
            {row.difficulty}
          </span>
        </div>
      ),
    },
    {
      key: 'cost',
      label: 'Amount',
      render: (cost: number) => (
        <span className="text-green-400 font-bold">{formatCurrency(cost)}</span>
      ),
    },
    {
      key: 'purchasedAt',
      label: 'Date',
      render: (date: string) => (
        <span className="text-zinc-400 text-sm">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Calculate chart data
  const maxDailyRevenue = data?.dailyRevenue
    ? Math.max(...data.dailyRevenue.map((d) => d.revenue), 1)
    : 1;

  const totalDailyRevenue = data?.dailyRevenue?.reduce((sum, d) => sum + d.revenue, 0) || 0;
  const avgDailyRevenue = data?.dailyRevenue?.length ? totalDailyRevenue / data.dailyRevenue.length : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <CRMPageHeader
        title="Revenue Analytics"
        description="Financial metrics, trends, and revenue breakdown"
        icon="💰"
        breadcrumbs={[{ label: 'Revenue' }]}
        onRefresh={fetchData}
        loading={loading}
        lastUpdated={lastUpdated}
        autoRefresh={false}
      />

      {/* Period Selector */}
      <div className="mb-6 flex gap-2">
        {['7d', '30d', '90d', 'all'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === p
                ? 'bg-teal-600 text-white'
                : 'bg-surface text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {p === '7d' && 'Last 7 Days'}
            {p === '30d' && 'Last 30 Days'}
            {p === '90d' && 'Last 90 Days'}
            {p === 'all' && 'All Time'}
          </button>
        ))}
      </div>

      {/* Revenue Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={`${period === 'all' ? 'All-Time' : period} Revenue`}
          value={data ? formatCurrency(data.summary.periodRevenue) : '-'}
          icon="💰"
          description={`${data?.summary.periodCount || 0} challenges`}
          loading={loading}
        />
        <StatCard
          title="MTD Revenue"
          value={data ? formatCurrency(data.summary.mtdRevenue) : '-'}
          icon="📅"
          description="Month to date"
          loading={loading}
        />
        <StatCard
          title="YTD Revenue"
          value={data ? formatCurrency(data.summary.ytdRevenue) : '-'}
          icon="📆"
          description="Year to date"
          loading={loading}
        />
        <StatCard
          title="All-Time Revenue"
          value={data ? formatCurrency(data.summary.allTimeRevenue) : '-'}
          icon="🏦"
          description="Total lifetime"
          loading={loading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Rewards Paid Out"
          value={data ? formatCurrency(data.summary.paidRewards) : '-'}
          icon="✅"
          description={`${data?.summary.paidRewardsCount || 0} rewards paid`}
          loading={loading}
        />
        <StatCard
          title="Pending Rewards"
          value={data ? formatCurrency(data.summary.pendingRewards) : '-'}
          icon="⚠️"
          description={`${data?.summary.pendingRewardsCount || 0} to process`}
          loading={loading}
        />
        <StatCard
          title="Net Profit"
          value={data ? formatCurrency(data.summary.allTimeRevenue - data.summary.paidRewards) : '-'}
          icon="💵"
          description="Revenue - Rewards Paid"
          loading={loading}
        />
      </div>

      {/* Tertiary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="ARPU"
          value={data ? formatCurrency(data.summary.arpu) : '-'}
          icon="👤"
          description="Avg revenue per user"
          loading={loading}
        />
        <StatCard
          title="Paying Users"
          value={data?.summary.payingUsers || 0}
          icon="💳"
          description={`of ${data?.summary.totalUsers || 0} total`}
          loading={loading}
        />
        <StatCard
          title="Conversion Rate"
          value={data ? `${data.summary.conversionRate.toFixed(1)}%` : '-'}
          icon="📈"
          description="Free to paid"
          loading={loading}
        />
      </div>

      {/* Difficulty Breakdown */}
      {data && data.difficultyRevenue && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Beginner Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Revenue</span>
                  <span className="text-teal-400 font-bold">{formatCurrency(data.difficultyRevenue.beginner.revenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Challenges Sold</span>
                  <span className="text-white font-bold">{data.difficultyRevenue.beginner.count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Min Odds</span>
                  <span className="text-zinc-400">1.5x</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pro Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Revenue</span>
                  <span className="text-teal-400 font-bold">{formatCurrency(data.difficultyRevenue.pro.revenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Challenges Sold</span>
                  <span className="text-white font-bold">{data.difficultyRevenue.pro.count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Min Odds</span>
                  <span className="text-zinc-400">2.0x</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Revenue Chart */}
      {data && data.dailyRevenue && data.dailyRevenue.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Daily Revenue</CardTitle>
              <div className="flex gap-4 text-sm">
                <div className="text-zinc-400">
                  Avg: <span className="text-white font-medium">{formatCurrency(avgDailyRevenue)}</span>/day
                </div>
                <div className="text-zinc-400">
                  Total: <span className="text-teal-400 font-medium">{formatCurrency(totalDailyRevenue)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex">
              <div className="w-16 flex flex-col justify-between text-xs text-zinc-500 pr-2">
                <span>{formatCurrency(maxDailyRevenue)}</span>
                <span>{formatCurrency(maxDailyRevenue / 2)}</span>
                <span>$0</span>
              </div>
              <div className="flex-1">
                <div className="h-56 flex items-end gap-0.5 border-l border-b border-zinc-700 pl-2 pb-2 relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-t border-zinc-800 border-dashed" />
                    <div className="border-t border-zinc-800 border-dashed" />
                    <div />
                  </div>
                  {data.dailyRevenue.map((day) => {
                    const height = (day.revenue / maxDailyRevenue) * 100;
                    return (
                      <div key={day.date} className="flex-1 group relative flex items-end h-full">
                        <div
                          className="w-full bg-teal-500 hover:bg-teal-400 rounded-t transition-all cursor-pointer"
                          style={{ height: `${Math.max(height, day.revenue > 0 ? height : 2)}%` }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                            <div className="text-white font-bold text-base">{formatCurrency(day.revenue)}</div>
                            <div className="text-zinc-400 mt-1">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                            <div className="text-teal-400 mt-1">{day.count} sale{day.count !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-500 pl-2">
                  <span>{new Date(data.dailyRevenue[0]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(data.dailyRevenue[Math.floor(data.dailyRevenue.length / 2)]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(data.dailyRevenue[data.dailyRevenue.length - 1]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Tier */}
      {data && data.tierRevenue && Object.keys(data.tierRevenue).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenue by Challenge Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.tierRevenue)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([tier, stats]) => {
                  const config = tierConfig[Number(tier)] || { label: `${parseInt(tier) / 1000}K`, icon: '📊', color: 'text-zinc-300' };
                  return (
                    <div key={tier} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{config.icon}</span>
                        <span className={`font-bold ${config.color}`}>{config.label}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-teal-400 font-bold">{formatCurrency(stats.revenue)}</div>
                          <div className="text-xs text-zinc-500">{stats.count} sold</div>
                        </div>
                        <div className="text-right w-20">
                          <div className="text-green-400 text-sm">{formatCurrency(stats.beginner.revenue)}</div>
                          <div className="text-xs text-zinc-500">{stats.beginner.count} beginner</div>
                        </div>
                        <div className="text-right w-20">
                          <div className="text-orange-400 text-sm">{formatCurrency(stats.pro.revenue)}</div>
                          <div className="text-xs text-zinc-500">{stats.pro.count} pro</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Revenue Users & Recent Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Spenders</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={topUsersColumns}
              data={data?.topUsers || []}
              loading={loading}
              emptyMessage="No purchases yet"
              maxItems={10}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={recentColumns}
              data={data?.recentPurchases || []}
              loading={loading}
              emptyMessage="No recent purchases"
              maxItems={10}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

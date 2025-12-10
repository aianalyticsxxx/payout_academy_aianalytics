// ==========================================
// REVENUE ANALYTICS PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';

interface RevenueAnalytics {
  summary: {
    periodRevenue: number;
    periodCount: number;
    mtdRevenue: number;
    ytdRevenue: number;
    allTimeRevenue: number;
    pendingRewards: number;
    pendingRewardsCount: number;
    arpu: number;
    totalUsers: number;
    payingUsers: number;
    conversionRate: number;
  };
  tierRevenue: Record<number, { revenue: number; count: number }>;
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

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/revenue?period=${period}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const tierLabels: Record<number, string> = {
    1000: '€1K Challenge',
    5000: '€5K Challenge',
    10000: '€10K Challenge',
    25000: '€25K Challenge',
    50000: '€50K Challenge',
    100000: '€100K Challenge',
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
      render: (tier: number) => (
        <span className="text-zinc-300">{tierLabels[tier] || `€${tier / 1000}K`}</span>
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

  // Calculate max revenue for chart scaling
  const maxDailyRevenue = data?.dailyRevenue
    ? Math.max(...data.dailyRevenue.map((d) => d.revenue), 1)
    : 1;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Revenue Analytics</h1>
        <p className="text-zinc-400">
          Financial metrics, trends, and revenue breakdown
        </p>
      </div>

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
          value={data ? formatCurrency(data.summary.periodRevenue) : '—'}
          icon="💰"
          description={`${data?.summary.periodCount || 0} challenges`}
          loading={loading}
        />
        <StatCard
          title="MTD Revenue"
          value={data ? formatCurrency(data.summary.mtdRevenue) : '—'}
          icon="📅"
          description="Month to date"
          loading={loading}
        />
        <StatCard
          title="YTD Revenue"
          value={data ? formatCurrency(data.summary.ytdRevenue) : '—'}
          icon="📆"
          description="Year to date"
          loading={loading}
        />
        <StatCard
          title="All-Time Revenue"
          value={data ? formatCurrency(data.summary.allTimeRevenue) : '—'}
          icon="🏦"
          description="Total lifetime"
          loading={loading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Pending Rewards"
          value={data ? formatCurrency(data.summary.pendingRewards) : '—'}
          icon="⚠️"
          description={`${data?.summary.pendingRewardsCount || 0} rewards`}
          loading={loading}
        />
        <StatCard
          title="ARPU"
          value={data ? formatCurrency(data.summary.arpu) : '—'}
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
          value={data ? `${data.summary.conversionRate.toFixed(1)}%` : '—'}
          icon="📈"
          description="Free to paid"
          loading={loading}
        />
      </div>

      {/* Daily Revenue Chart */}
      {data && data.dailyRevenue && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Daily Revenue (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {data.dailyRevenue.map((day, i) => {
                const height = (day.revenue / maxDailyRevenue) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 group relative"
                  >
                    <div
                      className="bg-teal-500 hover:bg-teal-400 rounded-t transition-all cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs whitespace-nowrap">
                        <div className="text-white font-medium">{formatCurrency(day.revenue)}</div>
                        <div className="text-zinc-400">{day.date}</div>
                        <div className="text-zinc-500">{day.count} sales</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>{data.dailyRevenue[0]?.date}</span>
              <span>{data.dailyRevenue[data.dailyRevenue.length - 1]?.date}</span>
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
            <div className="space-y-4">
              {Object.entries(data.tierRevenue)
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .map(([tier, stats]) => {
                  const percentage = data.summary.periodRevenue > 0
                    ? (stats.revenue / data.summary.periodRevenue) * 100
                    : 0;

                  return (
                    <div key={tier}>
                      <div className="flex justify-between mb-2">
                        <span className="text-zinc-300 font-medium">
                          {tierLabels[Number(tier)] || `€${parseInt(tier) / 1000}K`}
                          <span className="text-zinc-500 text-sm ml-2">({stats.count} sold)</span>
                        </span>
                        <span className="text-teal-400 font-bold">
                          {formatCurrency(stats.revenue)}
                        </span>
                      </div>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
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
            <CardTitle>🏆 Top Spenders</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={topUsersColumns}
              data={data?.topUsers || []}
              loading={loading}
              emptyMessage="No purchases yet"
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
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

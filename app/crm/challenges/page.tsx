// ==========================================
// CHALLENGE ANALYTICS PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/ui/Badge';

interface ChallengeAnalytics {
  summary: {
    totalChallenges: number;
    totalRevenue: number;
    avgDaysToComplete: number;
    completionRate: number;
  };
  revenueByTier: Record<number, { revenue: number; count: number }>;
  statusDistribution: Record<string, number>;
  completionByTier: Record<number, { total: number; completed: number; rate: number }>;
  levelDistribution: Record<number, number>;
  recentChallenges: any[];
  expiringSoon: any[];
}

export default function ChallengesPage() {
  const [data, setData] = useState<ChallengeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/challenges?period=${period}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch challenge analytics:', error);
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
    1000: '€1K',
    5000: '€5K',
    10000: '€10K',
    25000: '€25K',
    50000: '€50K',
    100000: '€100K',
  };

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
      label: 'Tier',
      render: (tier: number) => (
        <span className="text-zinc-300 font-medium">{tierLabels[tier] || `€${tier / 1000}K`}</span>
      ),
    },
    {
      key: 'currentLevel',
      label: 'Level',
      render: (level: number) => (
        <span className="text-teal-400 font-bold">Level {level}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (cost: number) => (
        <span className="text-green-400">{formatCurrency(cost)}</span>
      ),
    },
    {
      key: 'purchasedAt',
      label: 'Purchased',
      render: (date: string) => (
        <span className="text-zinc-400 text-sm">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const expiringColumns = [
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
      label: 'Tier',
      render: (tier: number) => (
        <span className="text-zinc-300 font-medium">{tierLabels[tier] || `€${tier / 1000}K`}</span>
      ),
    },
    {
      key: 'currentLevel',
      label: 'Progress',
      render: (level: number) => (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className={`w-2 h-2 rounded-full ${l <= level ? 'bg-teal-500' : 'bg-zinc-700'}`}
            />
          ))}
          <span className="ml-2 text-zinc-400 text-sm">Level {level}</span>
        </div>
      ),
    },
    {
      key: 'expiresAt',
      label: 'Expires',
      render: (date: string) => {
        const expires = new Date(date);
        const now = new Date();
        const hoursLeft = Math.round((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
        return (
          <span className={`text-sm font-medium ${hoursLeft < 24 ? 'text-red-400' : 'text-orange-400'}`}>
            {hoursLeft < 24 ? `${hoursLeft}h left` : `${Math.round(hoursLeft / 24)}d left`}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Challenge Analytics</h1>
        <p className="text-zinc-400">
          Performance metrics and trends for challenge system
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Challenges"
          value={data?.summary.totalChallenges || 0}
          icon="🎯"
          description={`In ${period}`}
          loading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={data ? formatCurrency(data.summary.totalRevenue) : '—'}
          icon="💰"
          description="From challenges"
          loading={loading}
        />
        <StatCard
          title="Completion Rate"
          value={data ? `${data.summary.completionRate.toFixed(1)}%` : '—'}
          icon="✅"
          description="Challenges completed"
          loading={loading}
        />
        <StatCard
          title="Avg Days to Complete"
          value={data?.summary.avgDaysToComplete || 0}
          icon="⏱️"
          description="Average completion time"
          loading={loading}
        />
      </div>

      {/* Revenue by Tier */}
      {data && data.revenueByTier && Object.keys(data.revenueByTier).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenue by Challenge Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.revenueByTier)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([tier, stats]) => {
                  const totalRevenue = data.summary.totalRevenue || 1;
                  const percentage = (stats.revenue / totalRevenue) * 100;

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
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
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

      {/* Status Distribution & Level Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.statusDistribution ? (
              <div className="space-y-3">
                {Object.entries(data.statusDistribution).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <StatusBadge status={status} />
                    <span className="text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-4">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Challenges by Level</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.levelDistribution ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className="flex justify-between items-center">
                    <span className="text-zinc-300">Level {level}</span>
                    <span className="text-teal-400 font-bold">
                      {data.levelDistribution[level] || 0}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-4">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon */}
      {data && data.expiringSoon && data.expiringSoon.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              <span className="text-orange-400">⚠️</span> Expiring Soon (within 3 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={expiringColumns}
              data={data.expiringSoon}
              loading={loading}
              emptyMessage="No challenges expiring soon"
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Challenges */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={recentColumns}
            data={data?.recentChallenges || []}
            loading={loading}
            emptyMessage="No challenges found"
          />
        </CardContent>
      </Card>
    </div>
  );
}

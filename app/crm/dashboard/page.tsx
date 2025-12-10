// ==========================================
// EXECUTIVE DASHBOARD PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { StatCard } from '@/components/crm/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface DashboardMetrics {
  users: {
    total: number;
    new: number;
    active: number;
  };
  challenges: {
    active: number;
  };
  revenue: {
    total: number;
    count: number;
    byTier: Record<number, number>;
  };
  rewards: {
    pending: { total: number; count: number };
  };
  bets: {
    total: number;
  };
  ai: {
    overallWinRate: number;
    topAgent: any;
  };
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/dashboard?period=${period}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Executive Dashboard</h1>
        <p className="text-zinc-400">
          Overview of your platform's key metrics and performance
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

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Revenue"
          value={metrics ? formatCurrency(metrics.revenue.total) : '—'}
          icon="💰"
          description={`${metrics?.revenue.count || 0} challenges`}
          loading={loading}
        />

        <StatCard
          title="Active Users"
          value={metrics?.users.active || 0}
          icon="👥"
          description={`${metrics?.users.total || 0} total users`}
          loading={loading}
        />

        <StatCard
          title="Active Challenges"
          value={metrics?.challenges.active || 0}
          icon="🎯"
          description="Currently in progress"
          loading={loading}
        />

        <StatCard
          title="Pending Rewards"
          value={metrics ? formatCurrency(metrics.rewards.pending.total) : '—'}
          icon="🎁"
          description={`${metrics?.rewards.pending.count || 0} rewards`}
          loading={loading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Bets"
          value={metrics?.bets.total || 0}
          icon="🎲"
          description={`In ${period}`}
          loading={loading}
        />

        <StatCard
          title="New Users"
          value={metrics?.users.new || 0}
          icon="✨"
          description={`In ${period}`}
          loading={loading}
        />

        <StatCard
          title="AI Win Rate"
          value={metrics ? `${metrics.ai.overallWinRate.toFixed(1)}%` : '—'}
          icon="🤖"
          description={metrics?.ai.topAgent ? `Top: ${metrics.ai.topAgent.agentName}` : ''}
          loading={loading}
        />
      </div>

      {/* Revenue by Tier */}
      {metrics && metrics.revenue.byTier && Object.keys(metrics.revenue.byTier).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenue by Challenge Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.revenue.byTier)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([tier, amount]) => {
                  const tierLabels: Record<string, string> = {
                    '1000': '€1K Challenge',
                    '5000': '€5K Challenge',
                    '10000': '€10K Challenge',
                    '25000': '€25K Challenge',
                    '50000': '€50K Challenge',
                    '100000': '€100K Challenge',
                  };

                  const percentage =
                    (amount / metrics.revenue.total) * 100;

                  return (
                    <div key={tier}>
                      <div className="flex justify-between mb-2">
                        <span className="text-zinc-300 font-medium">
                          {tierLabels[tier] || `€${parseInt(tier) / 1000}K`}
                        </span>
                        <span className="text-teal-400 font-bold">
                          {formatCurrency(amount)}
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/crm/users"
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 transition-all"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold text-white">Manage Users</div>
              <div className="text-sm text-zinc-500">View and edit user accounts</div>
            </a>

            <a
              href="/crm/operations"
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 transition-all"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="font-semibold text-white">Pending Rewards</div>
              <div className="text-sm text-zinc-500">
                {metrics?.rewards.pending.count || 0} rewards to process
              </div>
            </a>

            <a
              href="/crm/challenges"
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 transition-all"
            >
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-semibold text-white">Challenge Analytics</div>
              <div className="text-sm text-zinc-500">View performance and completion rates</div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// EXECUTIVE DASHBOARD PAGE
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/crm/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CRMPageHeader } from '@/components/crm/CRMPageHeader';

interface DashboardMetrics {
  users: {
    total: number;
    new: number;
    active: number;
    paying: number;
  };
  challenges: {
    active: number;
  };
  revenue: {
    total: number;
    count: number;
    byTier: Record<number, { revenue: number; count: number }>;
    mtd: number;
    ytd: number;
    allTime: number;
    arpu: number;
    conversionRate: number;
  };
  rewards: {
    pending: { total: number; count: number };
    paid: { total: number; count: number };
  };
  bets: {
    total: number;
  };
  ai: {
    overallWinRate: number;
    topAgent: any;
  };
  topSpenders: Array<{
    id: string;
    username: string | null;
    email: string | null;
    totalSpent: number;
    challengeCount: number;
  }>;
  dailyRevenue: Array<{ date: string; revenue: number; count: number }>;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/dashboard?period=${period}`);
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <CRMPageHeader
        title="Executive Dashboard"
        description="Overview of your platform's key metrics and performance"
        icon="📊"
        breadcrumbs={[{ label: 'Dashboard' }]}
        onRefresh={fetchMetrics}
        loading={loading}
        lastUpdated={lastUpdated}
        autoRefresh={false}
        autoRefreshInterval={60}
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

      {/* Key Metrics - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={metrics?.users.total || 0}
          icon="👥"
          description={`${metrics?.users.new || 0} new in ${period}`}
          loading={loading}
        />

        <StatCard
          title="Active Users"
          value={metrics?.users.active || 0}
          icon="🟢"
          description={`In ${period}`}
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
          title="Total Bets"
          value={metrics?.bets.total || 0}
          icon="🎲"
          description={`In ${period}`}
          loading={loading}
        />
      </div>

      {/* Key Metrics - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="All-Time Net Profit"
          value={metrics ? formatCurrency(metrics.revenue.allTime - metrics.rewards.paid.total) : '—'}
          icon="💵"
          description="Revenue - Rewards Paid"
          loading={loading}
        />

        <StatCard
          title="All-Time Revenue"
          value={metrics ? formatCurrency(metrics.revenue.allTime) : '—'}
          icon="🏦"
          description="Total lifetime"
          loading={loading}
        />

        <StatCard
          title="Paying Users"
          value={metrics?.users.paying || 0}
          icon="💳"
          description={`${metrics?.revenue.conversionRate || 0}% conversion`}
          loading={loading}
        />

        <StatCard
          title="Pending Rewards"
          value={metrics ? formatCurrency(metrics.rewards.pending.total) : '—'}
          icon="⚠️"
          description={`${metrics?.rewards.pending.count || 0} to process`}
          loading={loading}
        />
      </div>

      {/* Key Metrics - Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Rewards Paid Out"
          value={metrics ? formatCurrency(metrics.rewards.paid.total) : '—'}
          icon="✅"
          description={`${metrics?.rewards.paid.count || 0} rewards paid`}
          loading={loading}
        />

        <StatCard
          title="ARPU"
          value={metrics ? formatCurrency(metrics.revenue.arpu) : '—'}
          icon="👤"
          description="Avg revenue per user"
          loading={loading}
        />

        <StatCard
          title="New Users"
          value={metrics?.users.new || 0}
          icon="✨"
          description={`In ${period}`}
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a
              href="/crm/revenue"
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 transition-all"
            >
              <div className="text-2xl mb-2">💰</div>
              <div className="font-semibold text-white">Revenue Analytics</div>
              <div className="text-sm text-zinc-500">Detailed revenue breakdown</div>
            </a>

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

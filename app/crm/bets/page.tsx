// ==========================================
// BETTING ANALYTICS PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';

interface BettingAnalytics {
  summary: {
    totalBets: number;
    totalParlays: number;
    totalStaked: number;
    winRate: number;
    totalProfitLoss: number;
    unsettledCount: number;
  };
  sportStats: Record<string, { count: number; staked: number; profitLoss: number }>;
  winRateBySport: Record<string, { wins: number; losses: number; rate: number }>;
  typeDistribution: Record<string, number>;
  recentBets: any[];
  highStakeBets: any[];
  unsettledBets: any[];
}

export default function BetsPage() {
  const [data, setData] = useState<BettingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState<'recent' | 'highstake' | 'unsettled'>('recent');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/bets?period=${period}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch betting analytics:', error);
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

  const sportLabels: Record<string, string> = {
    basketball_nba: 'NBA',
    basketball_euroleague: 'Euroleague',
    soccer_epl: 'Premier League',
    soccer_spain_la_liga: 'La Liga',
    soccer_italy_serie_a: 'Serie A',
    soccer_germany_bundesliga: 'Bundesliga',
    americanfootball_nfl: 'NFL',
    icehockey_nhl: 'NHL',
    baseball_mlb: 'MLB',
  };

  const betColumns = [
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
      key: 'sport',
      label: 'Sport',
      render: (sport: string) => (
        <span className="text-zinc-300">{sportLabels[sport] || sport}</span>
      ),
    },
    {
      key: 'matchup',
      label: 'Matchup',
      render: (matchup: string) => (
        <span className="text-zinc-300 text-sm">{matchup}</span>
      ),
    },
    {
      key: 'selection',
      label: 'Selection',
      render: (selection: string) => (
        <span className="text-teal-400 font-medium">{selection}</span>
      ),
    },
    {
      key: 'stake',
      label: 'Stake',
      render: (stake: number) => (
        <span className="text-white font-bold">{formatCurrency(stake)}</span>
      ),
    },
    {
      key: 'odds',
      label: 'Odds',
      render: (odds: string) => (
        <span className="text-zinc-400">{odds}</span>
      ),
    },
    {
      key: 'result',
      label: 'Result',
      render: (result: string) => <StatusBadge status={result} />,
    },
    {
      key: 'profitLoss',
      label: 'P/L',
      render: (pl: number | null, row: any) => (
        row.result === 'PENDING' ? (
          <span className="text-zinc-500">—</span>
        ) : (
          <span className={pl && pl >= 0 ? 'text-green-400' : 'text-red-400'}>
            {formatCurrency(pl || 0)}
          </span>
        )
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Betting Analytics</h1>
        <p className="text-zinc-400">
          Betting activity, performance, and trends
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Bets"
          value={data?.summary.totalBets || 0}
          icon="🎲"
          description={`+ ${data?.summary.totalParlays || 0} parlays`}
          loading={loading}
        />
        <StatCard
          title="Total Staked"
          value={data ? formatCurrency(data.summary.totalStaked) : '—'}
          icon="💵"
          description="All bets combined"
          loading={loading}
        />
        <StatCard
          title="Win Rate"
          value={data ? `${data.summary.winRate}%` : '—'}
          icon="📊"
          description="Settled bets"
          loading={loading}
        />
        <StatCard
          title="Total P/L"
          value={data ? formatCurrency(data.summary.totalProfitLoss) : '—'}
          icon={data && data.summary.totalProfitLoss >= 0 ? '📈' : '📉'}
          description="Platform-wide"
          loading={loading}
        />
        <StatCard
          title="Unsettled Bets"
          value={data?.summary.unsettledCount || 0}
          icon="⏳"
          description="Awaiting results"
          loading={loading}
        />
        <StatCard
          title="Parlays"
          value={data?.summary.totalParlays || 0}
          icon="🎰"
          description="Multi-leg bets"
          loading={loading}
        />
      </div>

      {/* Sport Stats & Win Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Bets by Sport</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.sportStats && Object.keys(data.sportStats).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.sportStats)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([sport, stats]) => (
                    <div key={sport} className="flex justify-between items-center">
                      <span className="text-zinc-300">{sportLabels[sport] || sport}</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{stats.count}</span>
                        <span className="text-zinc-500 text-sm ml-2">
                          ({formatCurrency(stats.staked)})
                        </span>
                      </div>
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
            <CardTitle>Win Rate by Sport</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.winRateBySport && Object.keys(data.winRateBySport).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.winRateBySport)
                  .filter(([, stats]) => stats.wins + stats.losses > 0)
                  .sort(([, a], [, b]) => b.rate - a.rate)
                  .map(([sport, stats]) => (
                    <div key={sport}>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-300">{sportLabels[sport] || sport}</span>
                        <span className="text-teal-400 font-bold">{stats.rate.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${stats.rate}%` }}
                        />
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {stats.wins}W - {stats.losses}L
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-4">No settled bets</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bet Type Distribution */}
      {data && data.typeDistribution && Object.keys(data.typeDistribution).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Bet Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(data.typeDistribution).map(([type, count]) => (
                <div key={type} className="bg-zinc-800 rounded-lg px-4 py-3">
                  <div className="text-zinc-400 text-sm">{type}</div>
                  <div className="text-white font-bold text-xl">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bets Table with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bets</CardTitle>
            <div className="flex gap-2">
              {[
                { key: 'recent', label: 'Recent' },
                { key: 'highstake', label: 'High Stakes' },
                { key: 'unsettled', label: 'Unsettled' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={betColumns}
            data={
              activeTab === 'recent'
                ? data?.recentBets || []
                : activeTab === 'highstake'
                ? data?.highStakeBets || []
                : data?.unsettledBets || []
            }
            loading={loading}
            emptyMessage="No bets found"
          />
        </CardContent>
      </Card>
    </div>
  );
}

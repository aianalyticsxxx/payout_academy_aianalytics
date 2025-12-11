// ==========================================
// BETTING ANALYTICS PAGE
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { CRMPageHeader } from '@/components/crm/CRMPageHeader';

interface DifficultyStats {
  count: number;
  wins: number;
  losses: number;
  staked: number;
  winRate: number;
}

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
  difficultyStats: {
    beginner: DifficultyStats;
    pro: DifficultyStats;
    unlinked: DifficultyStats;
  };
  recentBets: any[];
  highStakeBets: any[];
  unsettledBets: any[];
}

export default function BetsPage() {
  const [data, setData] = useState<BettingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState<'recent' | 'highstake' | 'unsettled'>('recent');
  const [settlingBetId, setSettlingBetId] = useState<string | null>(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedBet, setSelectedBet] = useState<any>(null);
  const [settleResult, setSettleResult] = useState<'won' | 'lost' | 'push' | 'void'>('won');
  const [settleReason, setSettleReason] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/bets?period=${period}`);
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch betting analytics:', error);
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

  const handleManualSettle = async () => {
    if (!selectedBet) return;

    try {
      setSettlingBetId(selectedBet.id);
      const response = await fetch(`/api/crm/bets/${selectedBet.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: settleResult,
          reason: settleReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Settlement failed');
        return;
      }

      alert(`Bet settled as ${settleResult}`);
      setShowSettleModal(false);
      setSelectedBet(null);
      setSettleReason('');
      await fetchData();
    } catch (error) {
      console.error('Settlement error:', error);
      alert('Settlement failed');
    } finally {
      setSettlingBetId(null);
    }
  };

  const openSettleModal = (bet: any) => {
    setSelectedBet(bet);
    setSettleResult('won');
    setSettleReason('');
    setShowSettleModal(true);
  };

  // Map league keys to sport names for display (used in bets table)
  const getSportName = (leagueKey: string): string => {
    if (leagueKey.startsWith('basketball')) return 'Basketball';
    if (leagueKey.startsWith('soccer')) return 'Football';
    if (leagueKey.startsWith('americanfootball')) return 'American Football';
    if (leagueKey.startsWith('icehockey')) return 'Ice Hockey';
    if (leagueKey.startsWith('baseball')) return 'Baseball';
    if (leagueKey.startsWith('tennis')) return 'Tennis';
    if (leagueKey.startsWith('mma')) return 'MMA';
    if (leagueKey.startsWith('boxing')) return 'Boxing';
    if (leagueKey.startsWith('golf')) return 'Golf';
    if (leagueKey.startsWith('aussierules')) return 'Aussie Rules';
    if (leagueKey.startsWith('rugbyleague')) return 'Rugby League';
    if (leagueKey.startsWith('rugbyunion')) return 'Rugby Union';
    return leagueKey;
  };

  const betColumns = [
    {
      key: 'createdAt',
      label: 'Date & Time',
      render: (createdAt: string) => (
        <div className="text-sm">
          <div className="text-white">{new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <div className="text-zinc-500 text-xs">{new Date(createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
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
        <span className="text-zinc-300">{getSportName(sport)}</span>
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
  ];

  // Additional columns for unsettled bets with settle action
  const unsettledBetColumns = [
    ...betColumns,
    {
      key: 'id',
      label: 'Action',
      render: (id: string, row: any) => (
        row.result === 'pending' || row.result === 'PENDING' ? (
          <button
            onClick={() => openSettleModal(row)}
            disabled={settlingBetId === id}
            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
          >
            {settlingBetId === id ? 'Settling...' : 'Settle'}
          </button>
        ) : (
          <span className="text-zinc-500">—</span>
        )
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <CRMPageHeader
        title="Betting Analytics"
        description="Betting activity, performance, and trends"
        icon="🎲"
        breadcrumbs={[{ label: 'Betting' }]}
        onRefresh={fetchData}
        loading={loading}
        lastUpdated={lastUpdated}
        autoRefresh={true}
        autoRefreshInterval={30}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Bets"
          value={data?.summary.totalBets || 0}
          icon="🎲"
          description={`+ ${data?.summary.totalParlays || 0} parlays`}
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
              <div className="space-y-4">
                {(() => {
                  const totalBets = Object.values(data.sportStats).reduce((sum, s) => sum + s.count, 0);
                  return Object.entries(data.sportStats)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .map(([sport, stats]) => {
                      const percentage = totalBets > 0 ? (stats.count / totalBets) * 100 : 0;
                      return (
                        <div key={sport} className="bg-zinc-800/30 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium">{sport}</span>
                            <span className="text-teal-400 font-bold">{stats.count} bets</span>
                          </div>
                          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-zinc-500">{percentage.toFixed(1)}% of all bets</div>
                        </div>
                      );
                    });
                })()}
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-8">No betting data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Sport</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.winRateBySport && Object.keys(data.winRateBySport).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(data.winRateBySport)
                  .filter(([, stats]) => stats.wins + stats.losses > 0)
                  .sort(([, a], [, b]) => b.rate - a.rate)
                  .map(([sport, stats]) => {
                    const total = stats.wins + stats.losses;
                    return (
                      <div key={sport} className="bg-zinc-800/30 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">{sport}</span>
                          <span className={`font-bold ${stats.rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              stats.rate >= 50
                                ? 'bg-gradient-to-r from-green-600 to-green-400'
                                : 'bg-gradient-to-r from-red-600 to-red-400'
                            }`}
                            style={{ width: `${stats.rate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-400">{stats.wins} wins</span>
                          <span className="text-zinc-500">{total} total</span>
                          <span className="text-red-400">{stats.losses} losses</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-8">No settled bets yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Beginner vs Pro Stats */}
      {data && data.difficultyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Beginner Bets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-zinc-800/30 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Total Bets</span>
                    <span className="text-teal-400 font-bold">{data.difficultyStats.beginner.count}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Win Rate</span>
                    <span className={`font-bold ${data.difficultyStats.beginner.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.difficultyStats.beginner.winRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.difficultyStats.beginner.winRate >= 50
                          ? 'bg-gradient-to-r from-green-600 to-green-400'
                          : 'bg-gradient-to-r from-red-600 to-red-400'
                      }`}
                      style={{ width: `${data.difficultyStats.beginner.winRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">{data.difficultyStats.beginner.wins} wins</span>
                    <span className="text-zinc-500">{data.difficultyStats.beginner.wins + data.difficultyStats.beginner.losses} settled</span>
                    <span className="text-red-400">{data.difficultyStats.beginner.losses} losses</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pro Bets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-zinc-800/30 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Total Bets</span>
                    <span className="text-teal-400 font-bold">{data.difficultyStats.pro.count}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Win Rate</span>
                    <span className={`font-bold ${data.difficultyStats.pro.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.difficultyStats.pro.winRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.difficultyStats.pro.winRate >= 50
                          ? 'bg-gradient-to-r from-green-600 to-green-400'
                          : 'bg-gradient-to-r from-red-600 to-red-400'
                      }`}
                      style={{ width: `${data.difficultyStats.pro.winRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">{data.difficultyStats.pro.wins} wins</span>
                    <span className="text-zinc-500">{data.difficultyStats.pro.wins + data.difficultyStats.pro.losses} settled</span>
                    <span className="text-red-400">{data.difficultyStats.pro.losses} losses</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            columns={activeTab === 'unsettled' ? unsettledBetColumns : betColumns}
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

      {/* Manual Settlement Modal */}
      {showSettleModal && selectedBet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Manual Settlement</h3>

            {/* Bet Details */}
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
              <div className="text-sm text-zinc-400 mb-1">Bet Details</div>
              <div className="text-white font-medium">{selectedBet.matchup}</div>
              <div className="text-teal-400">{selectedBet.selection}</div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-zinc-400">Stake: {formatCurrency(selectedBet.stake)}</span>
                <span className="text-zinc-400">Odds: {selectedBet.odds}</span>
              </div>
            </div>

            {/* Result Selection */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-2">Settlement Result</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'won', label: 'Won', color: 'bg-green-600 hover:bg-green-700' },
                  { key: 'lost', label: 'Lost', color: 'bg-red-600 hover:bg-red-700' },
                  { key: 'push', label: 'Push', color: 'bg-yellow-600 hover:bg-yellow-700' },
                  { key: 'void', label: 'Void', color: 'bg-zinc-600 hover:bg-zinc-700' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSettleResult(opt.key as any)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      settleResult === opt.key
                        ? opt.color + ' text-white ring-2 ring-white/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">Reason (logged)</label>
              <textarea
                value={settleReason}
                onChange={(e) => setSettleReason(e.target.value)}
                placeholder="Reason for manual settlement..."
                className="w-full bg-zinc-800 text-white px-3 py-2 rounded-lg border border-zinc-700 h-20 resize-none"
              />
            </div>

            {/* Payout Preview */}
            <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Profit/Loss:</span>
                <span className={
                  settleResult === 'won' ? 'text-green-400 font-bold' :
                  settleResult === 'lost' ? 'text-red-400 font-bold' :
                  'text-zinc-400'
                }>
                  {settleResult === 'won' && `+${formatCurrency(selectedBet.stake * (selectedBet.oddsDecimal - 1))}`}
                  {settleResult === 'lost' && `-${formatCurrency(selectedBet.stake)}`}
                  {(settleResult === 'push' || settleResult === 'void') && '$0.00'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSettleModal(false);
                  setSelectedBet(null);
                }}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSettle}
                disabled={settlingBetId !== null}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {settlingBetId ? 'Settling...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

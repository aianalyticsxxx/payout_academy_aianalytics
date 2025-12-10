// ==========================================
// USER DETAIL PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/ui/Badge';

interface UserDetail {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    avatar: string | null;
    tier: string;
    role: string;
    createdAt: string;
    stripeCustomerId: string | null;
  };
  stats: {
    totalBets: number;
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    totalProfit: number;
    roi: number;
    currentStreak: number;
    bestStreak: number;
    totalChallenges: number;
    activeChallenges: number;
    completedChallenges: number;
    totalSpent: number;
    totalRewardsEarned: number;
  };
  recentBets: any[];
  challenges: any[];
  parlays: any[];
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/users/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/crm/users');
          return;
        }
        throw new Error('Failed to fetch user');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/crm/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update role');
        return;
      }

      await fetchData();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const tierColors: Record<string, string> = {
    BRONZE: 'text-orange-400',
    SILVER: 'text-zinc-300',
    GOLD: 'text-yellow-400',
    PLATINUM: 'text-cyan-400',
    DIAMOND: 'text-purple-400',
  };

  const betColumns = [
    {
      key: 'matchup',
      label: 'Matchup',
      render: (matchup: string) => (
        <span className="text-white font-medium">{matchup}</span>
      ),
    },
    {
      key: 'sport',
      label: 'Sport',
      render: (sport: string) => (
        <span className="text-zinc-400">{sport}</span>
      ),
    },
    {
      key: 'selection',
      label: 'Selection',
      render: (selection: string) => (
        <span className="text-zinc-300">{selection}</span>
      ),
    },
    {
      key: 'stake',
      label: 'Stake',
      render: (stake: number) => (
        <span className="text-zinc-300">{formatCurrency(stake)}</span>
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
      render: (pl: number) => (
        <span className={pl >= 0 ? 'text-green-400' : 'text-red-400'}>
          {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
        </span>
      ),
    },
  ];

  const challengeColumns = [
    {
      key: 'tier',
      label: 'Tier',
      render: (tier: number) => (
        <span className="text-white font-medium">${tier / 1000}K</span>
      ),
    },
    {
      key: 'currentLevel',
      label: 'Level',
      render: (level: number) => (
        <span className="text-teal-400">Level {level}</span>
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
        <span className="text-zinc-300">{formatCurrency(cost)}</span>
      ),
    },
    {
      key: 'totalRewardsEarned',
      label: 'Rewards',
      render: (rewards: number) => (
        <span className="text-green-400">{formatCurrency(rewards)}</span>
      ),
    },
    {
      key: 'purchasedAt',
      label: 'Purchased',
      render: (date: string) => (
        <span className="text-zinc-400">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-800 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <p className="text-zinc-400">User not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        href="/crm/users"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <span>←</span>
        <span>Back to Users</span>
      </Link>

      {/* User Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-3xl font-bold text-white">
            {data.user.avatar || data.user.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {data.user.username || 'No username'}
            </h1>
            <p className="text-zinc-400">{data.user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`font-medium ${tierColors[data.user.tier] || 'text-zinc-400'}`}>
                {data.user.tier}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">
                Joined {new Date(data.user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Role Management */}
        <div className="bg-surface border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500 mb-2">User Role</p>
          <div className="flex items-center gap-2">
            <select
              value={data.user.role}
              onChange={(e) => updateRole(e.target.value)}
              disabled={updating}
              className="bg-zinc-800 text-white px-3 py-2 rounded-lg border border-zinc-700 focus:border-teal-500 outline-none"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
            {updating && (
              <span className="text-zinc-400 text-sm">Updating...</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Bets"
          value={data.stats.totalBets}
          icon="🎯"
          description={`${data.stats.wins}W / ${data.stats.losses}L / ${data.stats.pushes}P`}
        />
        <StatCard
          title="Win Rate"
          value={`${data.stats.winRate.toFixed(1)}%`}
          icon="📈"
          description={`Streak: ${data.stats.currentStreak >= 0 ? '+' : ''}${data.stats.currentStreak}`}
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(data.stats.totalProfit)}
          icon={data.stats.totalProfit >= 0 ? '💰' : '📉'}
          description={`ROI: ${data.stats.roi.toFixed(1)}%`}
        />
        <StatCard
          title="Best Streak"
          value={data.stats.bestStreak}
          icon="🔥"
          description="Consecutive wins"
        />
      </div>

      {/* Challenge Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Challenges"
          value={data.stats.totalChallenges}
          icon="🎯"
          description={`${data.stats.activeChallenges} active`}
        />
        <StatCard
          title="Completed"
          value={data.stats.completedChallenges}
          icon="✅"
          description="Challenges completed"
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(data.stats.totalSpent)}
          icon="💳"
          description="On challenges"
        />
        <StatCard
          title="Rewards Earned"
          value={formatCurrency(data.stats.totalRewardsEarned)}
          icon="🏆"
          description="From challenges"
        />
      </div>

      {/* Challenges */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={challengeColumns}
            data={data.challenges}
            emptyMessage="No challenges found"
          />
        </CardContent>
      </Card>

      {/* Recent Bets */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Bets</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={betColumns}
            data={data.recentBets}
            emptyMessage="No bets found"
          />
        </CardContent>
      </Card>

      {/* Parlays */}
      {data.parlays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Parlays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.parlays.map((parlay: any) => (
                <div
                  key={parlay.id}
                  className="bg-zinc-800/50 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-white font-medium">
                        {parlay.legs?.length || 0} Leg Parlay
                      </span>
                      <span className="text-zinc-500 ml-2">
                        @ {parlay.totalOdds?.toFixed(2)}
                      </span>
                    </div>
                    <StatusBadge status={parlay.result} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">
                      Stake: {formatCurrency(parlay.stake)}
                    </span>
                    <span className={parlay.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {parlay.profitLoss >= 0 ? '+' : ''}{formatCurrency(parlay.profitLoss || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==========================================
// AI PERFORMANCE PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';

interface AIAnalytics {
  summary: {
    totalPredictions: number;
    settledPredictions: number;
    overallAccuracy: number;
    topAgentName: string;
    topAgentWinRate: number;
  };
  aiLeaderboard: Array<{
    id: string;
    agentName: string;
    wins: number;
    losses: number;
    pushes: number;
    totalPredictions: number;
    winRate: number;
    roi: number;
    currentStreak: number;
    bestStreak: number;
  }>;
  consensusStats: Record<string, number>;
  consensusPerformance: Record<string, { total: number; correct: number; rate: number }>;
  recentPredictions: any[];
}

export default function AIPage() {
  const [data, setData] = useState<AIAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/analytics/ai?period=${period}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch AI analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const agentEmojis: Record<string, string> = {
    'Claude': '🧠',
    'GPT': '🤖',
    'Gemini': '💎',
    'Grok': '⚡',
    'Llama': '🦙',
    'Perplexity': '🔍',
    'DeepSeek': '🔬',
  };

  const consensusColors: Record<string, string> = {
    'STRONG BET': 'bg-green-500',
    'SLIGHT EDGE': 'bg-teal-500',
    'RISKY': 'bg-orange-500',
    'AVOID': 'bg-red-500',
    'SPLIT': 'bg-zinc-500',
  };

  const leaderboardColumns = [
    {
      key: 'agentName',
      label: 'Agent',
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{agentEmojis[name] || '🤖'}</span>
          <span className="text-white font-medium">{name}</span>
        </div>
      ),
    },
    {
      key: 'winRate',
      label: 'Win Rate',
      render: (rate: number) => (
        <span className={`font-bold ${rate >= 55 ? 'text-green-400' : rate >= 50 ? 'text-teal-400' : 'text-red-400'}`}>
          {rate.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'totalPredictions',
      label: 'Total',
      render: (total: number) => (
        <span className="text-zinc-300">{total}</span>
      ),
    },
    {
      key: 'wins',
      label: 'W/L/P',
      render: (_: number, row: any) => (
        <span className="text-zinc-400">
          <span className="text-green-400">{row.wins}</span>/
          <span className="text-red-400">{row.losses}</span>/
          <span className="text-zinc-500">{row.pushes}</span>
        </span>
      ),
    },
    {
      key: 'roi',
      label: 'ROI',
      render: (roi: number) => (
        <span className={roi >= 0 ? 'text-green-400' : 'text-red-400'}>
          {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'currentStreak',
      label: 'Streak',
      render: (streak: number) => (
        <span className={streak >= 0 ? 'text-green-400' : 'text-red-400'}>
          {streak >= 0 ? `🔥 ${streak}` : `❄️ ${Math.abs(streak)}`}
        </span>
      ),
    },
    {
      key: 'bestStreak',
      label: 'Best',
      render: (best: number) => (
        <span className="text-yellow-400">{best}</span>
      ),
    },
  ];

  const predictionColumns = [
    {
      key: 'eventId',
      label: 'Event',
      render: (id: string) => (
        <span className="text-zinc-400 text-sm font-mono">{id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'sport',
      label: 'Sport',
      render: (sport: string) => (
        <span className="text-zinc-300">{sport}</span>
      ),
    },
    {
      key: 'consensusVerdict',
      label: 'Consensus',
      render: (consensus: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${consensusColors[consensus] || 'bg-zinc-600'}`}>
          {consensus || 'N/A'}
        </span>
      ),
    },
    {
      key: 'confidence',
      label: 'Confidence',
      render: (conf: number) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full"
              style={{ width: `${conf}%` }}
            />
          </div>
          <span className="text-zinc-400 text-sm">{conf}%</span>
        </div>
      ),
    },
    {
      key: 'result',
      label: 'Result',
      render: (result: string) => {
        // Map lowercase result values to display format
        const statusMap: Record<string, string> = {
          'pending': 'PENDING',
          'won': 'WON',
          'lost': 'LOST',
          'push': 'PUSH',
        };
        return <StatusBadge status={statusMap[result] || result.toUpperCase()} />;
      },
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (date: string) => (
        <span className="text-zinc-400 text-sm">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">AI Performance</h1>
        <p className="text-zinc-400">
          AI swarm prediction accuracy and agent leaderboard
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
          title="Overall Accuracy"
          value={data ? `${data.summary.overallAccuracy}%` : '—'}
          icon="🎯"
          description="Settled predictions"
          loading={loading}
        />
        <StatCard
          title="Total Predictions"
          value={data?.summary.totalPredictions || 0}
          icon="🔮"
          description={`${data?.summary.settledPredictions || 0} settled`}
          loading={loading}
        />
        <StatCard
          title="Top Agent"
          value={data?.summary.topAgentName || '—'}
          icon={agentEmojis[data?.summary.topAgentName || ''] || '🏆'}
          description={data ? `${data.summary.topAgentWinRate.toFixed(1)}% win rate` : ''}
          loading={loading}
        />
        <StatCard
          title="AI Agents"
          value={data?.aiLeaderboard.length || 0}
          icon="🤖"
          description="Active in swarm"
          loading={loading}
        />
      </div>

      {/* Consensus Distribution & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Consensus Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.consensusStats && Object.keys(data.consensusStats).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.consensusStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([consensus, count]) => (
                    <div key={consensus} className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${consensusColors[consensus] || 'bg-zinc-600'}`}>
                        {consensus}
                      </span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-4">No predictions yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accuracy by Consensus</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.consensusPerformance && Object.keys(data.consensusPerformance).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.consensusPerformance)
                  .filter(([, stats]) => stats.total > 0)
                  .sort(([, a], [, b]) => b.rate - a.rate)
                  .map(([consensus, stats]) => (
                    <div key={consensus}>
                      <div className="flex justify-between mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${consensusColors[consensus] || 'bg-zinc-600'}`}>
                          {consensus}
                        </span>
                        <span className="text-teal-400 font-bold">{stats.rate.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${stats.rate}%` }}
                        />
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {stats.correct}/{stats.total} correct
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-4">No settled predictions</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Agent Leaderboard */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>🏆 AI Agent Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.aiLeaderboard && data.aiLeaderboard.length > 0 ? (
            <DataTable
              columns={leaderboardColumns}
              data={data.aiLeaderboard}
              loading={loading}
              emptyMessage="No agents found"
            />
          ) : (
            <div className="text-zinc-500 text-center py-8">
              No AI agents in leaderboard yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={predictionColumns}
            data={data?.recentPredictions || []}
            loading={loading}
            emptyMessage="No predictions found"
          />
        </CardContent>
      </Card>
    </div>
  );
}

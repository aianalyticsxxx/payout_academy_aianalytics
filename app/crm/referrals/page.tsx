// ==========================================
// CRM REFERRALS PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';

interface ReferralAnalytics {
  stats: {
    totalReferrals: number;
    pendingReferrals: number;
    qualifiedReferrals: number;
    totalRewardsEarned: number;
    pendingPayouts: number;
    conversionRate: string;
  };
  topReferrers: Array<{
    id: string;
    username: string | null;
    email: string | null;
    avatar: string;
    referralCode: string | null;
    referralRewards: number;
    totalReferrals: number;
  }>;
  referrals: Array<{
    id: string;
    status: string;
    rewardAmount: number;
    createdAt: string;
    qualifiedAt: string | null;
    paidAt: string | null;
    referrer: {
      id: string;
      username: string | null;
      email: string | null;
      avatar: string;
    };
    referred: {
      id: string;
      username: string | null;
      email: string | null;
      avatar: string;
      joinedAt: string;
    };
  }>;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm/analytics/referrals');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch referral analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const referralColumns = [
    {
      key: 'referrer',
      label: 'Referrer',
      render: (referrer: any) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{referrer.avatar}</span>
          <div>
            <div className="text-white font-medium">{referrer.username || 'No username'}</div>
            <div className="text-xs text-zinc-500">{referrer.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'referred',
      label: 'Referred User',
      render: (referred: any) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{referred.avatar}</span>
          <div>
            <div className="text-white font-medium">{referred.username || 'No username'}</div>
            <div className="text-xs text-zinc-500">
              Joined {new Date(referred.joinedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: string) => (
        <Badge
          variant={
            status === 'paid' ? 'success' :
            status === 'qualified' ? 'warning' :
            'default'
          }
        >
          {status}
        </Badge>
      ),
    },
    {
      key: 'rewardAmount',
      label: 'Reward',
      render: (amount: number) => (
        <span className={amount > 0 ? 'text-green-400 font-bold' : 'text-zinc-500'}>
          {amount > 0 ? formatCurrency(amount) : '—'}
        </span>
      ),
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

  const topReferrerColumns = [
    {
      key: 'avatar',
      label: '',
      render: (avatar: string) => <span className="text-2xl">{avatar}</span>,
    },
    {
      key: 'username',
      label: 'Referrer',
      render: (username: string | null, row: any) => (
        <div>
          <div className="text-white font-medium">{username || 'No username'}</div>
          <div className="text-xs text-zinc-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'referralCode',
      label: 'Code',
      render: (code: string | null) => (
        <span className="font-mono text-teal-400">{code || '—'}</span>
      ),
    },
    {
      key: 'totalReferrals',
      label: 'Referrals',
      render: (count: number) => (
        <span className="text-white font-bold">{count}</span>
      ),
    },
    {
      key: 'referralRewards',
      label: 'Total Earned',
      render: (amount: number) => (
        <span className="text-green-400 font-bold">{formatCurrency(amount)}</span>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Referral Analytics</h1>
        <p className="text-zinc-400">
          Track referral program performance and rewards
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Referrals"
          value={data?.stats.totalReferrals || 0}
          icon="👥"
          description={`${data?.stats.pendingReferrals || 0} pending`}
          loading={loading}
        />
        <StatCard
          title="Qualified"
          value={data?.stats.qualifiedReferrals || 0}
          icon="✅"
          description={`${data?.stats.conversionRate || '0'}% conversion`}
          loading={loading}
        />
        <StatCard
          title="Total Rewards"
          value={data ? formatCurrency(data.stats.totalRewardsEarned) : '—'}
          icon="💰"
          description={`${formatCurrency(data?.stats.pendingPayouts || 0)} pending`}
          loading={loading}
        />
      </div>

      {/* Top Referrers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top Referrers</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.topReferrers.length > 0 ? (
            <DataTable
              columns={topReferrerColumns}
              data={data.topReferrers}
              loading={loading}
              emptyMessage="No referrers yet"
            />
          ) : (
            <div className="text-center py-8 text-zinc-500">
              No top referrers yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={referralColumns}
            data={data?.referrals || []}
            loading={loading}
            emptyMessage="No referrals yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}

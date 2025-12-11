// ==========================================
// CRM REFERRALS PAGE
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { DataTable } from '@/components/crm/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { CRMPageHeader } from '@/components/crm/CRMPageHeader';

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

interface CustomLink {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  referrerReward: number;
  referredDiscount: number;
  clicks: number;
  signups: number;
  conversions: number;
  totalRevenue: number;
  isActive: boolean;
  expiresAt: string | null;
  fullUrl: string;
  referralCount: number;
  createdAt: string;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form state
  const [newLink, setNewLink] = useState({
    slug: '',
    name: '',
    description: '',
    referrerReward: 15,
    referredDiscount: 15,
    expiresAt: '',
  });

  useEffect(() => {
    fetchData();
    fetchCustomLinks();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm/analytics/referrals');
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch referral analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomLinks = async () => {
    try {
      setLinksLoading(true);
      const response = await fetch('/api/crm/referral-links');
      const result = await response.json();
      setCustomLinks(result.links || []);
    } catch (error) {
      console.error('Failed to fetch custom links:', error);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchData(), fetchCustomLinks()]);
  }, [fetchData]);

  const createCustomLink = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/crm/referral-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newLink.slug.toLowerCase().replace(/\s+/g, '-'),
          name: newLink.name,
          description: newLink.description || undefined,
          referrerReward: newLink.referrerReward / 100,
          referredDiscount: newLink.referredDiscount / 100,
          expiresAt: newLink.expiresAt || undefined,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewLink({ slug: '', name: '', description: '', referrerReward: 15, referredDiscount: 15, expiresAt: '' });
        fetchCustomLinks();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create link');
      }
    } catch (error) {
      console.error('Failed to create link:', error);
      alert('Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const toggleLinkStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/crm/referral-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchCustomLinks();
      }
    } catch (error) {
      console.error('Failed to toggle link status:', error);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
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
      <CRMPageHeader
        title="Referral Analytics"
        description="Track referral program performance and rewards"
        icon="🔗"
        breadcrumbs={[{ label: 'Referrals' }]}
        onRefresh={handleRefresh}
        loading={loading || linksLoading}
        lastUpdated={lastUpdated}
        autoRefresh={false}
      />

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

      {/* Custom Referral Links */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custom Referral Links</CardTitle>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Create Link
          </button>
        </CardHeader>
        <CardContent>
          {linksLoading ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : customLinks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-zinc-400">No custom links yet</p>
              <p className="text-sm text-zinc-500 mt-1">Create custom referral links for marketing campaigns</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customLinks.map((link) => (
                <div
                  key={link.id}
                  className={`p-4 rounded-xl border ${
                    link.isActive
                      ? 'bg-zinc-800/30 border-zinc-700'
                      : 'bg-zinc-900/50 border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{link.name}</span>
                        <Badge variant={link.isActive ? 'success' : 'default'}>
                          {link.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                          <Badge variant="warning">Expired</Badge>
                        )}
                      </div>
                      {link.description && (
                        <p className="text-sm text-zinc-500 mb-2">{link.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs bg-zinc-900 px-2 py-1 rounded text-teal-400 font-mono truncate max-w-md">
                          {link.fullUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(link.fullUrl, link.id)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            copied === link.id
                              ? 'bg-green-600 text-white'
                              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          }`}
                        >
                          {copied === link.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>Referrer: <span className="text-green-400">{(link.referrerReward * 100).toFixed(0)}%</span></span>
                        <span>Discount: <span className="text-purple-400">{(link.referredDiscount * 100).toFixed(0)}%</span></span>
                        <span>Signups: <span className="text-white">{link.referralCount}</span></span>
                        {link.expiresAt && (
                          <span>Expires: {new Date(link.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLinkStatus(link.id, link.isActive)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        link.isActive
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                          : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      }`}
                    >
                      {link.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create Custom Link</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Link Slug *
                </label>
                <input
                  type="text"
                  value={newLink.slug}
                  onChange={(e) => setNewLink({ ...newLink, slug: e.target.value })}
                  placeholder="e.g., summer-promo"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  URL will be: /register?ref={newLink.slug || 'your-slug'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={newLink.name}
                  onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                  placeholder="e.g., Summer 2024 Campaign"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  value={newLink.description}
                  onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                  placeholder="Optional campaign description"
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Referrer Reward (%)
                  </label>
                  <input
                    type="number"
                    value={newLink.referrerReward}
                    onChange={(e) => setNewLink({ ...newLink, referrerReward: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    User Discount (%)
                  </label>
                  <input
                    type="number"
                    value={newLink.referredDiscount}
                    onChange={(e) => setNewLink({ ...newLink, referredDiscount: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Expires At (Optional)
                </label>
                <input
                  type="date"
                  value={newLink.expiresAt}
                  onChange={(e) => setNewLink({ ...newLink, expiresAt: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCustomLink}
                disabled={!newLink.slug || !newLink.name || creating}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      )}

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

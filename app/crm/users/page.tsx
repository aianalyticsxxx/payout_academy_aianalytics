// ==========================================
// USER MANAGEMENT PAGE
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/crm/DataTable';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { CRMPageHeader } from '@/components/crm/CRMPageHeader';

interface User {
  id: string;
  username: string | null;
  email: string | null;
  avatar: string;
  tier: string;
  role: string;
  createdAt: string;
  leaderboardEntry: {
    totalBets: number;
    winRate: number;
    roi: number;
    totalProfit: number;
  } | null;
  _count: {
    challenges: number;
    bets: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [search, tier, difficulty, page]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        ...(tier && { tier }),
        ...(difficulty && { difficulty }),
      });

      const response = await fetch(`/api/crm/users?${params}`);
      const data = await response.json();

      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, tier, difficulty]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const columns = [
    {
      key: 'avatar',
      label: '',
      render: (value: string) => (
        <span className="text-2xl">{value}</span>
      ),
    },
    {
      key: 'username',
      label: 'User',
      render: (value: string | null, row: User) => (
        <Link href={`/crm/users/${row.id}`} className="block hover:bg-zinc-800/50 -m-2 p-2 rounded-lg transition-colors">
          <div className="text-white font-medium hover:text-teal-400">{value || 'No username'}</div>
          <div className="text-xs text-zinc-500">{row.email}</div>
        </Link>
      ),
    },
    {
      key: 'tier',
      label: 'Tier',
      render: (value: string) => (
        <Badge variant={
          value === 'Diamond' ? 'info' :
          value === 'Platinum' ? 'success' :
          value === 'Gold' ? 'warning' :
          'default'
        }>
          {value}
        </Badge>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => (
        <Badge variant={value === 'SUPER_ADMIN' || value === 'ADMIN' ? 'warning' : 'default'}>
          {value}
        </Badge>
      ),
    },
    {
      key: '_count',
      label: 'Challenges',
      render: (value: { challenges: number }) => (
        <span className="text-zinc-300">{value.challenges}</span>
      ),
    },
    {
      key: 'leaderboardEntry',
      label: 'Stats',
      render: (value: User['leaderboardEntry']) => value ? (
        <div className="text-sm">
          <div className="text-zinc-300">
            <span className="text-white font-medium">{value.totalBets}</span> bets
          </div>
          <div className="text-zinc-500">
            {value.winRate.toFixed(1)}% WR · {value.roi.toFixed(1)}% ROI
          </div>
        </div>
      ) : (
        <span className="text-zinc-500">No stats</span>
      ),
    },
    {
      key: 'leaderboardEntry',
      label: 'Profit/Loss',
      render: (value: User['leaderboardEntry']) => value ? (
        <span className={value.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
          {formatCurrency(value.totalProfit)}
        </span>
      ) : (
        <span className="text-zinc-500">—</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value: string) => (
        <span className="text-zinc-400 text-sm">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <CRMPageHeader
        title="User Management"
        description="View and manage all platform users"
        icon="👥"
        breadcrumbs={[{ label: 'Users' }]}
        onRefresh={fetchUsers}
        loading={loading}
        lastUpdated={lastUpdated}
        autoRefresh={false}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <Select
          value={tier}
          onChange={(e) => {
            setTier(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Tiers' },
            { value: 'Bronze', label: 'Bronze' },
            { value: 'Silver', label: 'Silver' },
            { value: 'Gold', label: 'Gold' },
            { value: 'Diamond', label: 'Diamond' },
          ]}
        />

        <Select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Difficulties' },
            { value: 'beginner', label: 'Beginner' },
            { value: 'pro', label: 'Pro' },
          ]}
        />

        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-sm">Total Users:</span>
          <span className="text-white font-bold">{users.length}</span>
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-surface border border-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="text-zinc-400 mx-4">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-surface border border-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

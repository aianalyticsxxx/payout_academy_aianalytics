// ==========================================
// ADMINISTRATION PAGE - ADMIN ACTIONS LOG
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/crm/StatCard';
import { CRMPageHeader } from '@/components/crm/CRMPageHeader';

interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
  admin: {
    id: string;
    username: string | null;
    email: string | null;
    avatar: string;
  };
}

interface LogsResponse {
  logs: AdminLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
  // User actions (important only)
  UPDATE_USER_ROLE: { label: 'Updated Role', icon: '🔑', color: 'text-orange-400' },
  BAN_USER: { label: 'Banned User', icon: '🚫', color: 'text-red-400' },
  UNBAN_USER: { label: 'Unbanned User', icon: '✅', color: 'text-green-400' },
  DELETE_USER: { label: 'Deleted User', icon: '🗑️', color: 'text-red-400' },

  // Rewards
  PAY_REWARD: { label: 'Paid Reward', icon: '💸', color: 'text-green-400' },
  REJECT_REWARD: { label: 'Rejected Reward', icon: '❌', color: 'text-red-400' },

  // Bets
  SETTLE_BET: { label: 'Settled Bet', icon: '✅', color: 'text-teal-400' },
  VOID_BET: { label: 'Voided Bet', icon: '🚫', color: 'text-red-400' },

  // Challenges
  AWARD_FREE_CHALLENGE: { label: 'Awarded Free Challenge', icon: '🎁', color: 'text-green-400' },
  RESET_CHALLENGE_FREE: { label: 'Reset Challenge', icon: '🔄', color: 'text-orange-400' },
  EXTEND_CHALLENGE: { label: 'Extended Challenge', icon: '⏰', color: 'text-blue-400' },
  CANCEL_CHALLENGE: { label: 'Cancelled Challenge', icon: '🚫', color: 'text-red-400' },

  // Referrals
  CREATE_REFERRAL_LINK: { label: 'Created Referral Link', icon: '🔗', color: 'text-teal-400' },
  DELETE_REFERRAL_LINK: { label: 'Deleted Referral Link', icon: '🗑️', color: 'text-red-400' },
  UPDATE_REFERRAL_LINK: { label: 'Updated Referral Link', icon: '✏️', color: 'text-orange-400' },

  // Data
  EXPORT_DATA: { label: 'Exported Data', icon: '📤', color: 'text-purple-400' },
};

const targetTypeLabels: Record<string, string> = {
  USER: 'User',
  BET: 'Bet',
  CHALLENGE: 'Challenge',
  REWARD: 'Reward',
  REFERRAL_LINK: 'Referral Link',
};

export default function AdminPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (actionFilter) params.append('action', actionFilter);

      const response = await fetch(`/api/crm/admin-logs?${params}`);
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch admin logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action, icon: '📋', color: 'text-zinc-400' };
  };

  // Get unique actions for filter
  const uniqueActions = data?.logs
    ? [...new Set(data.logs.map((log) => log.action))]
    : [];

  // Stats calculation
  const todayLogs = data?.logs.filter((log) => {
    const logDate = new Date(log.createdAt);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length || 0;

  const uniqueAdmins = data?.logs
    ? new Set(data.logs.map((log) => log.adminId)).size
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <CRMPageHeader
        title="Administration"
        description="Admin actions audit log and system administration"
        icon="🛡️"
        breadcrumbs={[{ label: 'Administration' }]}
        onRefresh={fetchLogs}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Actions"
          value={data?.pagination.total || 0}
          icon="📋"
          description="All time"
          loading={loading}
        />
        <StatCard
          title="Today's Actions"
          value={todayLogs}
          icon="📅"
          description="Last 24 hours"
          loading={loading}
        />
        <StatCard
          title="Active Admins"
          value={uniqueAdmins}
          icon="👤"
          description="In current view"
          loading={loading}
        />
        <StatCard
          title="Page"
          value={`${data?.pagination.page || 1} / ${data?.pagination.totalPages || 1}`}
          icon="📄"
          description={`${data?.pagination.limit || 25} per page`}
          loading={loading}
        />
      </div>

      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-surface border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
        >
          <option value="">All Actions</option>
          {Object.entries(actionLabels).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Admin Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions Log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-800/30 rounded-lg" />
              ))}
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No admin actions recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {data?.logs.map((log) => {
                const actionInfo = getActionInfo(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Action Icon */}
                      <div className="text-2xl">{actionInfo.icon}</div>

                      {/* Action Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                          {log.targetType && (
                            <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">
                              {targetTypeLabels[log.targetType] || log.targetType}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500 mt-1">
                          <span className="text-zinc-400">
                            {log.admin.username || log.admin.email}
                          </span>
                          {log.targetId && (
                            <span className="ml-2 text-zinc-600">
                              Target: {log.targetId.slice(0, 8)}...
                            </span>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <span className="ml-2 text-zinc-600">
                              {JSON.stringify(log.metadata).slice(0, 50)}
                              {JSON.stringify(log.metadata).length > 50 && '...'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">{formatTimeAgo(log.createdAt)}</div>
                      <div className="text-xs text-zinc-600">{formatDate(log.createdAt)}</div>
                      {log.ipAddress && (
                        <div className="text-xs text-zinc-600 mt-1">{log.ipAddress}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-zinc-400">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

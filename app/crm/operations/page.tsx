// ==========================================
// OPERATIONS PAGE
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/crm/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { CRMPageHeader } from '@/components/crm/CRMPageHeader';

interface Reward {
  id: string;
  level: number;
  amount: number;
  status: string;
  earnedAt: string;
  challenge: {
    tier: number;
    user: {
      id: string;
      username: string | null;
      email: string | null;
    };
  };
}

export default function OperationsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingRewards();
  }, []);

  const fetchPendingRewards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm/rewards/pending');
      const data = await response.json();
      setRewards(data.rewards || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch pending rewards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAsPaid = async (rewardId: string) => {
    if (!confirm('Are you sure you want to mark this reward as paid?')) {
      return;
    }

    try {
      setProcessingId(rewardId);
      const response = await fetch(`/api/crm/rewards/${rewardId}/pay`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove the paid reward from the list
        setRewards(rewards.filter((r) => r.id !== rewardId));
        alert('Reward marked as paid successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to mark reward as paid'}`);
      }
    } catch (error) {
      console.error('Failed to mark reward as paid:', error);
      alert('Failed to mark reward as paid');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (reward: Reward) => {
    setSelectedReward(reward);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedReward) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingId(selectedReward.id);
      const response = await fetch(`/api/crm/rewards/${selectedReward.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const result = await response.json();

      if (response.ok) {
        setRewards(rewards.filter((r) => r.id !== selectedReward.id));
        alert('Reward rejected successfully');
        setShowRejectModal(false);
        setSelectedReward(null);
        setRejectReason('');
      } else {
        alert(`Error: ${result.error || 'Failed to reject reward'}`);
      }
    } catch (error) {
      console.error('Failed to reject reward:', error);
      alert('Failed to reject reward');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalPending = rewards.reduce((sum, r) => sum + r.amount, 0);

  const tierLabels: Record<number, string> = {
    1000: '€1K',
    5000: '€5K',
    10000: '€10K',
    25000: '€25K',
    50000: '€50K',
    100000: '€100K',
  };

  const columns = [
    {
      key: 'challenge',
      label: 'User',
      render: (challenge: Reward['challenge']) => (
        <div>
          <div className="text-white font-medium">
            {challenge.user.username || 'No username'}
          </div>
          <div className="text-xs text-zinc-500">{challenge.user.email}</div>
        </div>
      ),
    },
    {
      key: 'challenge',
      label: 'Tier',
      render: (challenge: Reward['challenge']) => (
        <span className="text-zinc-300 font-medium">
          {tierLabels[challenge.tier] || `${challenge.tier}`}
        </span>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (level: number) => (
        <span className="text-teal-400 font-bold">Level {level}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (amount: number) => (
        <span className="text-green-400 font-bold text-lg">
          {formatCurrency(amount)}
        </span>
      ),
    },
    {
      key: 'earnedAt',
      label: 'Earned',
      render: (earnedAt: string) => (
        <span className="text-zinc-400 text-sm">
          {new Date(earnedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      key: 'id',
      label: 'Action',
      render: (id: string, row: Reward) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleMarkAsPaid(id)}
            disabled={processingId === id}
          >
            {processingId === id ? 'Processing...' : 'Mark as Paid'}
          </Button>
          <button
            onClick={() => openRejectModal(row)}
            disabled={processingId === id}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <CRMPageHeader
        title="Operations"
        description="Manage pending rewards and operational tasks"
        icon="⚙️"
        breadcrumbs={[{ label: 'Operations' }]}
        onRefresh={fetchPendingRewards}
        loading={loading}
        lastUpdated={lastUpdated}
        autoRefresh={true}
        autoRefreshInterval={30}
      />

      {/* Pending Rewards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-400 text-sm font-medium mb-1">
              Total Pending Rewards
            </div>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(totalPending)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Liability to be paid out
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-400 text-sm font-medium mb-1">
              Pending Count
            </div>
            <div className="text-3xl font-bold text-white">
              {rewards.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Rewards awaiting payment
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-400 text-sm font-medium mb-1">
              Average Reward
            </div>
            <div className="text-3xl font-bold text-white">
              {rewards.length > 0
                ? formatCurrency(totalPending / rewards.length)
                : '$0'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Per reward payment
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Rewards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Rewards Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              Loading pending rewards...
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-zinc-400">No pending rewards!</p>
              <p className="text-sm text-zinc-600 mt-2">
                All rewards have been processed
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rewards}
              loading={loading}
              emptyMessage="No pending rewards"
            />
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Operations Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="text-white font-semibold mb-2">
                Processing Rewards
              </h4>
              <p className="text-zinc-400">
                Click "Mark as Paid" after you've processed the payment externally
                (via Stripe, bank transfer, etc.). This will update the status in the
                system and remove it from the pending queue.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">
                Rejecting Rewards
              </h4>
              <p className="text-zinc-400">
                Click "Reject" if a reward should not be paid (e.g., suspicious activity,
                terms violation). A reason is required and will be logged for audit purposes.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">
                Reward Levels
              </h4>
              <p className="text-zinc-400">
                Each challenge has 4 levels. Users earn rewards for completing each
                level. The reward amount increases with higher challenge tiers.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">
                Audit Trail
              </h4>
              <p className="text-zinc-400">
                All reward payments and rejections are logged in the admin action log
                with your admin ID, timestamp, and reward details for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && selectedReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-red-400 mb-4">Reject Reward</h3>

            {/* Reward Details */}
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
              <div className="text-sm text-zinc-400 mb-1">Reward Details</div>
              <div className="text-white font-medium">
                {selectedReward.challenge.user.username || selectedReward.challenge.user.email}
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-zinc-400">
                  {tierLabels[selectedReward.challenge.tier]} - Level {selectedReward.level}
                </span>
                <span className="text-green-400 font-bold">
                  {formatCurrency(selectedReward.amount)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg mb-4">
              <p className="text-sm text-red-400">
                This will permanently reject this reward. The user will not receive payment.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">Reason for rejection *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason..."
                className="w-full bg-zinc-800 text-white px-3 py-2 rounded-lg border border-zinc-700 h-24 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedReward(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId !== null || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processingId ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
